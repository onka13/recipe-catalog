import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { buildBundle, compareWithRelease, parseBody, readCatalog, readRecipe, renderItem, writeItem } from '../src/index.js';
import { sections } from '../src/markdown.js';
import { edit, FLUTTER, flutterFixture, remove, REPO } from './helpers.js';

const fixtures: string[] = [];
after(() => fixtures.forEach(remove));
const ITEM_FILES = { stack: 'STACK.md', scaffold: 'SCAFFOLD.md', recipe: 'RECIPE.md' } as const;

describe('read and write', () => {
  it('CAT-17: writing an item back gives the same file, for every item in the catalog', () => {
    const { catalog } = readCatalog(REPO);
    for (const item of [...catalog.stacks, ...catalog.scaffolds, ...catalog.recipes]) {
      const onDisk = fs.readFileSync(path.join(REPO, item.path, ITEM_FILES[item.kind]), 'utf8');
      assert.equal(renderItem(item), onDisk, item.path);
    }
  });

  it('writeItem then readRecipe returns the same item, files included', () => {
    const root = flutterFixture(); fixtures.push(root);
    const itemPath = `${FLUTTER}/recipes/monetization/admob-monetization`;
    const before = readRecipe(root, itemPath, []);
    assert.ok(before);
    writeItem(root, { ...before, files: [...before.files, { path: 'test/ad_service_test.dart', content: 'void main() {}\n' }] });
    const afterWrite = readRecipe(root, itemPath, []);
    assert.equal(afterWrite?.files.length, before.files.length + 1);
    assert.deepEqual(afterWrite?.instructions, before.instructions);
  });

  it('headings inside fenced code are not sections', () => {
    const body = '# T\n\nDesc.\n\n## Instructions\n\n### a.sh\nAdd:\n```bash\n## not a heading\n# also not\n```\n\n## Changelog\n\n### 1.0.0\n- First version.\n';
    const parsed = parseBody(body);
    assert.deepEqual(parsed.sections.map((s) => s.title), ['Instructions', 'Changelog']);
    assert.match(sections(parsed.sections[0].text, 3).sections[0].text, /## not a heading/);
  });
});

describe('bundle', () => {
  it('the bundle validates against bundle.schema.json and its hashes are stable', () => {
    const { catalog } = readCatalog(REPO);
    const first = buildBundle(catalog, '0.1.0');
    const second = buildBundle(readCatalog(REPO).catalog, '0.1.0');
    assert.equal(first.recipes.length, catalog.recipes.length);
    assert.deepEqual(first.recipes.map((r) => r.contentHash), second.recipes.map((r) => r.contentHash));
  });

  it('CAT-20: a released version that changed is rejected, and versions never go backwards', () => {
    const root = flutterFixture(); fixtures.push(root);
    const released = buildBundle(readCatalog(root).catalog, '0.1.0');
    const admob = `${FLUTTER}/recipes/monetization/admob-monetization`;
    edit(root, `${admob}/files/lib/core/ads/ad_service_port.dart`, (t) => `${t}// changed\n`);
    edit(root, `${FLUTTER}/recipes/core/core-foundation/RECIPE.md`, (t) => t.replace(/^version: .+$/m, 'version: 0.9.0').replace(/^### \d+\.\d+\.\d+$/m, '### 0.9.0'));
    const problems = compareWithRelease(buildBundle(readCatalog(root).catalog, '0.2.0'), released).filter((p) => p.severity === 'error');
    assert.match(problems.map((p) => p.message).join('\n'), /admob-monetization@1.0.0 was released in 0.1.0 and has changed/);
    assert.match(problems.map((p) => p.message).join('\n'), /version 0.9.0 is older than the released 1\.0\.\d/);
  });

  it('CAT-20: a change with a new version and changelog entry passes', () => {
    const root = flutterFixture(); fixtures.push(root);
    const released = buildBundle(readCatalog(root).catalog, '0.1.0');
    const admob = `${FLUTTER}/recipes/monetization/admob-monetization`;
    edit(root, `${admob}/files/lib/core/ads/ad_service_port.dart`, (t) => `${t}// changed\n`);
    edit(root, `${admob}/RECIPE.md`, (t) => t.replace('version: 1.0.0', 'version: 1.0.1').replace('## Changelog\n\n', '## Changelog\n\n### 1.0.1\n- Comment.\n\n'));
    assert.deepEqual(compareWithRelease(buildBundle(readCatalog(root).catalog, '0.2.0'), released), []);
  });
});
