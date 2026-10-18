import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { lintCatalog, readCatalog, type Problem } from '../src/index.js';
import { edit, FLUTTER, flutterFixture, remove, REPO } from './helpers.js';

const errorsOf = (root: string): Problem[] => {
  const { catalog, problems } = readCatalog(root);
  return [...problems, ...lintCatalog(catalog)].filter((p) => p.severity === 'error');
};
const ADMOB = `${FLUTTER}/recipes/monetization/admob-monetization`;
const fixtures: string[] = [];
const fixture = () => { const root = flutterFixture(); fixtures.push(root); return root; };
after(() => fixtures.forEach(remove));

describe('lint (format section 7.1)', () => {
  it('the catalog in this repository has no errors', () => {
    assert.deepEqual(errorsOf(REPO), []);
  });

  it('CAT-25: a recipe in the wrong category folder is rejected', () => {
    const root = fixture();
    fs.renameSync(path.join(root, ADMOB), path.join(root, `${FLUTTER}/recipes/storage/admob-monetization`));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /category "monetization" differs from the folder "storage"/);
  });

  it('CAT-25: a category that CATEGORIES.md does not list is rejected', () => {
    const root = fixture();
    fs.renameSync(path.join(root, `${FLUTTER}/recipes/monetization`), path.join(root, `${FLUTTER}/recipes/money`));
    edit(root, `${FLUTTER}/recipes/money/admob-monetization/RECIPE.md`, (t) => t.replace('category: monetization', 'category: money'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /category "money" is not listed in CATEGORIES.md/);
  });

  it('a new version needs its changelog entry', () => {
    const root = fixture();
    edit(root, `${ADMOB}/RECIPE.md`, (t) => t.replace('version: 1.0.0', 'version: 1.1.0'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /newest ## Changelog entry is "1.0.0"; it must be the current version 1.1.0/);
  });

  it('a mandatory recipe that does not exist in the stack is rejected', () => {
    const root = fixture();
    edit(root, `${FLUTTER}/scaffolds/flutter-app/SCAFFOLD.md`, (t) => t.replace('  - core-foundation\n', '  - core-foundatio\n'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /mandatory recipe "core-foundatio" is not a recipe/);
  });

  it('CAT-26: a front matter field the format does not define is rejected', () => {
    const root = fixture();
    edit(root, `${ADMOB}/RECIPE.md`, (t) => t.replace('order: 40', 'order: 40\npriority: high'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /must NOT have additional properties \(priority\)/);
  });

  it('a secret parameter must not have a default', () => {
    const root = fixture();
    edit(root, `${ADMOB}/RECIPE.md`, (t) => t.replace(/(default: ca-app-pub-3940256099942544~3347511713\n\s+secret: )false/, '$1true'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /Secret parameter ADMOB_APP_ID_ANDROID must not have a default/);
  });

  it('an undeclared placeholder is rejected', () => {
    const root = fixture();
    edit(root, `${ADMOB}/RECIPE.md`, (t) => t.replace('{{ADMOB_APP_ID_ANDROID}}', '{{ADMOB_APP_ID}}'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /\{\{ADMOB_APP_ID\}\} in ### android\/app\/src\/main\/AndroidManifest.xml is not a declared parameter/);
  });

  it('an instruction whose target is a file pattern is rejected (it belongs under ## Conventions)', () => {
    const root = fixture();
    edit(root, `${ADMOB}/RECIPE.md`, (t) => t.replace('### lib/main.dart', '### lib/**/*.dart'));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /lib\/\*\*\/\*\.dart is a pattern/);
  });

  it('a dependency cycle is rejected', () => {
    const root = fixture();
    edit(root, `${FLUTTER}/recipes/core/core-foundation/RECIPE.md`, (t) => t.replace('order: ', 'dependsOn:\n  - admob-monetization\norder: '));
    assert.match(errorsOf(root).map((p) => p.message).join('\n'), /dependsOn forms a cycle/);
  });

  it('binary files and symbolic links are rejected', () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, ADMOB, 'files/logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0x00]));
    fs.symlinkSync('/etc/hosts', path.join(root, ADMOB, 'files/hosts'));
    const messages = errorsOf(root).map((p) => p.message).join('\n');
    assert.match(messages, /binary files are not supported/);
    assert.match(messages, /Symbolic links are not allowed/);
  });

  it('a stack without its delivery-scripts recipe is rejected', () => {
    const root = fixture();
    fs.rmSync(path.join(root, `${FLUTTER}/recipes/delivery`), { recursive: true });
    const messages = errorsOf(root).map((p) => p.message).join('\n');
    assert.match(messages, /deliveryScriptsRecipe "flutter-delivery-scripts" is not a recipe of this stack/);
  });
});
