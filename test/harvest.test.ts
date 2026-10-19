import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { findTargets, projectContext } from '../src/harvest/context.js';
import { harvest } from '../src/harvest/harvest.js';
import { findLeaks } from '../src/harvest/secrets.js';
import { checkStaged } from '../src/harvest/stage.js';
import { hasErrors, lintCatalog, readCatalog, readRecipe } from '../src/index.js';
import { catalogFixture, changedFiles, remove, REPO, snapshot } from './helpers.js';
import { agentCalls, ENV_SECRET, fakeAgent, flutterProject, REAL_ADMOB_APP } from './support/harvestFixtures.js';

const temp: string[] = [];
after(() => temp.forEach(remove));
const keep = (dir: string) => { temp.push(dir); return dir; };
const ITEM = 'stacks/dart/mobile-flutter/recipes/monetization/ads-consent';
const CLI = path.join(REPO, 'dist/src/cli.js');

function options(catalogRoot: string, projectDir: string, bin: string) {
  return {
    catalogRoot, projectDir, capability: 'AdMob ads with consent', stack: 'mobile-flutter', budget: 4000,
    agent: { name: 'claude' as const, bin, model: 'haiku', timeoutMs: 60_000 }, fixRounds: 2, log: () => undefined,
  };
}

describe('CAT-23 harvest', () => {
  it('reads the project with Code Intelligence and gives the agent the files around the capability', async () => {
    const project = keep(flutterProject());
    const before = snapshot(project);
    const out = keep(fs.mkdtempSync(path.join(path.dirname(project), 'codeintel-')));
    const context = await projectContext({ projectDir: project, capability: 'AdMob ads with consent', budget: 4000, outDir: out });
    assert.deepEqual(context.targets.slice(0, 2).sort(), ['lib/core/ads/ad_service.dart', 'lib/core/ads/consent_manager.dart']);
    assert.ok(!context.targets.includes('lib/screens/cart.dart'), 'a file without the capability words is not a target');
    assert.match(context.text, /<project_map format="codeintel map">/);
    assert.match(context.text, /<file path="lib\/core\/ads\/ad_service.dart" role="target">\nimport 'package:acme_shop/);
    assert.match(context.text, /<skeleton path="lib\/main.dart" reason="imports lib\/core\/ads\/ad_service.dart">/);
    assert.equal(context.packageName, 'acme_shop');
    assert.deepEqual(changedFiles(before, snapshot(project)), [], 'the project is not changed, not even a code map is written into it');
  });

  it('refuses a capability that no file names, instead of guessing', async () => {
    const project = keep(flutterProject());
    const out = keep(fs.mkdtempSync(path.join(path.dirname(project), 'codeintel-')));
    await assert.rejects(projectContext({ projectDir: project, capability: 'video streaming', budget: 4000, outDir: out }), /Name the files the capability lives in with --files/);
  });

  it('finds secret values, account ids and the package name in an item; Google test ids are allowed', () => {
    const project = keep(flutterProject());
    const fixture = keep(catalogFixture());
    const recipe = readRecipe(fixture, 'stacks/dart/mobile-flutter/recipes/monetization/admob-monetization', []);
    assert.ok(recipe);
    assert.deepEqual(findLeaks(recipe, project, 'acme_shop'), [], 'the catalog\'s own AdMob recipe uses test ids only');
    const leaky = { ...recipe, files: [...recipe.files, { path: 'lib/x.dart', content: `import 'package:acme_shop/a.dart';\nconst id = '${REAL_ADMOB_APP}';\nconst s = '${ENV_SECRET}';\nconst k = 'AKIAABCDEFGHIJKLMNOP';\n` }] };
    const messages = findLeaks(leaky, project, 'acme_shop').map((p) => p.message).join('\n');
    assert.match(messages, /value of ADMOB_APP_ID from the project's \.env/);
    assert.match(messages, /value of PAYMENTS_SECRET/);
    assert.match(messages, /AdMob id ca-app-pub-1234567890123456/);
    assert.match(messages, /an AWS access key/);
    assert.match(messages, /package name "acme_shop"; use \{\{PACKAGE_NAME\}\}/);
  });

  it('runs the agent without interaction, sends back what the check found, and files the clean item', async () => {
    const catalogRoot = keep(catalogFixture());
    const project = keep(flutterProject());
    const before = snapshot(project);
    const agent = fakeAgent('fix');
    temp.push(path.dirname(agent.bin));
    const result = await harvest(options(catalogRoot, project, agent.bin));
    assert.equal(result.item?.path, ITEM, JSON.stringify(result.problems));
    const calls = agentCalls(agent.calls);
    assert.equal(calls.length, 2, 'one fix round');
    assert.deepEqual(calls[0].args.slice(0, 4), ['-p', '--permission-mode', 'acceptEdits', '--allowedTools']);
    assert.ok(calls[0].args.includes('--add-dir') && calls[0].args.includes(project), 'the agent may read the project');
    assert.equal(calls[0].args[calls[0].args.indexOf('--model') + 1], 'haiku', 'the chosen model is passed to the agent');
    assert.match(calls[0].prompt, /^You are turning one capability/, 'the prompt starts with the harvest-recipe skill');
    assert.match(calls[0].prompt, /<project_context folder=/);
    assert.match(calls[0].prompt, /<stack_baseline stack="mobile-flutter">[\s\S]*scripts\/test\.sh, which the check and every project run/);
    const problems1 = calls[1].prompt.slice(calls[1].prompt.indexOf('<problems>'));
    assert.match(problems1, /package name "acme_shop"/);
    assert.match(problems1, /value of ADMOB_APP_ID/);
    const { catalog, problems } = readCatalog(catalogRoot);
    assert.deepEqual([...problems, ...lintCatalog(catalog)].filter((p) => p.severity === 'error'), []);
    const filed = catalog.recipes.find((r) => r.path === ITEM);
    assert.match(filed?.files.find((f) => f.path === 'lib/core/ads/consent_manager.dart')?.content ?? '', /package:\{\{PACKAGE_NAME\}\}/);
    assert.ok(!fs.existsSync(result.stageDir), 'the staging folder is removed');
    assert.deepEqual(changedFiles(before, snapshot(project)), []);
  });

  it('adds nothing when the item still fails after the fix rounds, and keeps the agent\'s work for inspection', async () => {
    const catalogRoot = keep(catalogFixture());
    const project = keep(flutterProject());
    const agent = fakeAgent('never');
    temp.push(path.dirname(agent.bin));
    const result = await harvest({ ...options(catalogRoot, project, agent.bin), fixRounds: 1 });
    assert.equal(result.item, undefined);
    assert.ok(hasErrors(result.problems));
    assert.equal(agentCalls(agent.calls).length, 2);
    assert.ok(!fs.existsSync(path.join(catalogRoot, ITEM)));
    assert.ok(fs.existsSync(path.join(result.stageDir, 'item/RECIPE.md')) && fs.existsSync(path.join(result.stageDir, 'agent-0.log')));
  });

  it('stops at once and shows the agent\'s reply when it declines to write an item', async () => {
    const catalogRoot = keep(catalogFixture());
    const project = keep(flutterProject());
    const agent = fakeAgent('decline');
    temp.push(path.dirname(agent.bin));
    const result = await harvest(options(catalogRoot, project, agent.bin));
    assert.equal(result.declined, true);
    assert.equal(agentCalls(agent.calls).length, 1, 'no fix rounds');
    assert.match(result.problems[0].message, /wrote no item\. Its reply:\nThe stack already has this capability/);
  });

  it('a staged item lands in the folder its front matter names, never over an existing one', () => {
    const catalogRoot = keep(catalogFixture());
    const { catalog } = readCatalog(catalogRoot);
    const staged = keep(fs.mkdtempSync(path.join(catalogRoot, 'stage-')));
    fs.cpSync(path.join(catalogRoot, 'stacks/dart/mobile-flutter/recipes/monetization/admob-monetization'), path.join(staged, 'item'), { recursive: true });
    const checked = checkStaged(catalog, path.join(staged, 'item'), {});
    assert.equal(checked.item?.path, 'stacks/dart/mobile-flutter/recipes/monetization/admob-monetization');
    assert.match(checked.problems.map((p) => p.message).join('\n'), /already exists/);
  });

  it('the harvest command needs no model key: it refuses without --agent and points to the user\'s own agent', () => {
    const run = spawnSync(process.execPath, [CLI, 'harvest', '/tmp', 'ads', '--stack', 'mobile-flutter'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /harvest needs --agent claude\|codex\|copilot/);
  });

  it('the capability words find files by path and by declaration name', async () => {
    const project = keep(flutterProject());
    const out = keep(fs.mkdtempSync(path.join(path.dirname(project), 'codeintel-')));
    const { map } = await import('code-intelligence').then((ci) => ci.scan({ root: project, out, packs: ci.PACKS }));
    assert.deepEqual(findTargets(map, 'Cart items'), ['lib/screens/cart.dart']);
  });
});
