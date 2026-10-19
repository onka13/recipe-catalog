import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { buildBundle, readCatalog } from '../src/index.js';
import type { EditableItem } from '../src/studio/items.js';
import { startStudio } from '../src/studio/server.js';
import { catalogFixture, changedFiles, remove, snapshot } from './helpers.js';
import { fakeAgent, flutterProject } from './support/harvestFixtures.js';

const ADMOB = 'stacks/dart/mobile-flutter/recipes/monetization/admob-monetization';
let root: string;
let server: http.Server;
let base: string;
const temp: string[] = [];

function raw(method: string, url: string, headers: Record<string, string>, body?: string): Promise<{ status: number; text: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${url}`, { method, headers }, (res) => {
      let text = '';
      res.on('data', (c: Buffer) => { text += c.toString(); });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text, headers: res.headers }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function call<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${base}${url}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: (await res.json()) as T };
}

const git = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: root, encoding: 'utf8' });
type Lint = { path: string; problems: Array<{ message: string; severity: string }> };
type Save = Lint & { saved: boolean; item?: EditableItem };
const errors = (r: Lint) => r.problems.filter((p) => p.severity === 'error').map((p) => p.message);

before(async () => {
  root = catalogFixture();
  // The fixture's last release is its current content, so a changed file needs a new version (FORMAT.md 7.2).
  fs.mkdirSync(path.join(root, 'release'));
  fs.writeFileSync(path.join(root, 'release/catalog.json'), JSON.stringify(buildBundle(readCatalog(root).catalog, '0.1.0')));
  git('init', '-q'); git('add', '.'); git('commit', '-q', '-m', 'fixture');
  const started = await startStudio(root, 0);
  server = started.server;
  base = `http://127.0.0.1:${started.port}`;
});
after(() => { server.close(); remove(root); temp.forEach(remove); });

describe('CAT-28 Catalog Studio', () => {
  it('serves its page locally with a strict content policy, and answers only its own host and page', async () => {
    const page = await raw('GET', '/', {});
    assert.equal(page.status, 200);
    assert.match(page.text, /<title>Catalog Studio<\/title>/);
    assert.match(String(page.headers['content-security-policy']), /default-src 'self'/);
    assert.equal((await raw('GET', '/web/main.js', {})).status, 200);
    assert.equal((await raw('GET', '/api/catalog', { Host: 'evil.example:80' })).status, 403, 'DNS rebinding');
    const foreign = await raw('POST', '/api/lint', { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, '{}');
    assert.equal(foreign.status, 403, 'another site cannot call it');
    assert.equal((await raw('POST', '/api/lint', { 'Content-Type': 'text/plain' }, '{}')).status, 415);
    assert.equal((await raw('GET', '/web/../../package.json', {})).status, 404);
    assert.equal((await call('GET', `/api/item?path=${encodeURIComponent('../outside')}`)).status, 404);
  });

  it('shows an item with its front matter, Markdown sections and files, and its form schema', async () => {
    const { data: item } = await call<EditableItem>('GET', `/api/item?path=${encodeURIComponent(ADMOB)}`);
    assert.equal(item.meta.id, 'admob-monetization');
    assert.match(item.instructions, /^### android\/app\/src\/main\/AndroidManifest.xml/);
    assert.match(item.changelog, /^### 1\.0\.\d/);
    assert.ok(item.files.length > 0);
    const { data: schema } = await call<{ properties: Record<string, { pattern?: string; $ref?: string }> }>('GET', '/api/schema?kind=recipe');
    assert.ok(schema.properties.id.pattern && !schema.properties.id.$ref, 'references are resolved for the form');
  });

  it('blocks the save of a changed file without a new version, and of a version without a changelog entry', async () => {
    const before = snapshot(root);
    const { data: item } = await call<EditableItem>('GET', `/api/item?path=${encodeURIComponent(ADMOB)}`);
    item.files[0].content += '\n// changed\n';
    const lint = await call<Lint>('POST', '/api/lint', { item });
    assert.match(errors(lint.data).join('\n'), /was released in 0\.1\.0 and has changed; publish the change as a new version/);
    const blocked = await call<Save>('POST', '/api/save', { item });
    assert.equal(blocked.data.saved, false);
    item.meta.version = '1.9.0';
    assert.match(errors((await call<Lint>('POST', '/api/lint', { item })).data).join('\n'), /newest ## Changelog entry .* must be the current version 1\.9\.0/);
    assert.deepEqual(changedFiles(before, snapshot(root)), [], 'nothing was written');
  });

  it('"Save" writes only that item\'s folder, through the format library', async () => {
    const before = snapshot(root);
    const { data: item } = await call<EditableItem>('GET', `/api/item?path=${encodeURIComponent(ADMOB)}`);
    item.files[0].content += '\n// changed\n';
    item.meta.version = '1.9.0';
    item.changelog = `### 1.9.0\n- A comment.\n\n${item.changelog}`;
    const saved = await call<Save>('POST', '/api/save', { item });
    assert.equal(saved.data.saved, true, JSON.stringify(saved.data.problems));
    const changed = changedFiles(before, snapshot(root));
    assert.ok(changed.length === 2 && changed.every((f) => f.startsWith(`${ADMOB}/`)), changed.join(', '));
    assert.match(fs.readFileSync(path.join(root, ADMOB, 'RECIPE.md'), 'utf8'), /^version: 1\.9\.0$/m);
  });

  it('"New recipe" creates the folder its front matter names, at 1.0.0 with a changelog entry, once the lint passes', async () => {
    const created = await call<EditableItem>('POST', '/api/new', { stack: 'backend-node-tsoa', category: 'security', id: 'rate-limit' });
    const item = created.data;
    assert.equal(item.path, 'stacks/typescript/backend-node-tsoa/recipes/security/rate-limit');
    assert.equal(item.meta.version, '1.0.0');
    assert.match(item.changelog, /^### 1\.0\.0\n- First version\./);
    assert.ok(!fs.existsSync(path.join(root, item.path)), 'nothing is written before Save');
    assert.match(errors((await call<Lint>('POST', '/api/lint', { item })).data).join('\n'), /needs a description/);
    item.description = 'Limits requests per client.';
    item.meta.category = 'api';
    assert.equal((await call<Lint>('POST', '/api/lint', { item })).data.path, 'stacks/typescript/backend-node-tsoa/recipes/api/rate-limit', 'the path follows the front matter');
    item.meta.category = 'security';
    const saved = await call<Save>('POST', '/api/save', { item });
    assert.equal(saved.data.saved, true, JSON.stringify(saved.data.problems));
    assert.match(fs.readFileSync(path.join(root, item.path, 'RECIPE.md'), 'utf8'), /^category: security$/m);
    assert.equal((await call('POST', '/api/new', { stack: 'backend-node-tsoa', category: 'nope', id: 'x' })).status, 400);
  });

  it('lists the changed files as a diff for the pull request, without touching git\'s index', async () => {
    const { data } = await call<{ files: Array<{ status: string; path: string }>; diff: string }>('GET', '/api/changes');
    const paths = data.files.map((f) => f.path);
    assert.ok(paths.includes(`${ADMOB}/RECIPE.md`));
    assert.ok(paths.includes('stacks/typescript/backend-node-tsoa/recipes/security/rate-limit/RECIPE.md'));
    assert.match(data.diff, /\+version: 1\.9\.0/);
    assert.match(data.diff, /\+id: rate-limit/);
    assert.equal(git('diff', '--cached', '--name-only').stdout, '');
  });

  it('runs a harvest with the contributor\'s agent as a background job and shows its output', async () => {
    const project = flutterProject();
    const agent = fakeAgent('clean');
    temp.push(project, path.dirname(agent.bin));
    assert.equal((await call('POST', '/api/job', { command: 'harvest', project: 'relative/path', capability: 'x', stack: 'mobile-flutter', agent: 'claude' })).status, 400);
    assert.equal((await call('POST', '/api/job', { command: 'verify', id: 'admob-monetization', image: '--rm' })).status, 400);
    const started = await call<{ id: string }>('POST', '/api/job', { command: 'harvest', project, capability: 'AdMob ads with consent', stack: 'mobile-flutter', agent: 'claude', agentBin: agent.bin });
    let job = { status: 'running', output: '' };
    for (let i = 0; i < 100 && job.status === 'running'; i++) {
      await new Promise((r) => setTimeout(r, 100));
      job = (await call<typeof job>('GET', `/api/job?id=${started.data.id}`)).data;
    }
    assert.equal(job.status, 'passed', job.output);
    assert.match(job.output, /Added stacks\/dart\/mobile-flutter\/recipes\/monetization\/ads-consent/);
  });
});
