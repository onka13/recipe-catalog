import type { Catalog, Item, Problem, RecipeItem, ScaffoldItem } from './model.js';
import { BUILT_IN_PLACEHOLDERS } from './model.js';
import { describeErrors, validator } from './schemas.js';

const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
const TEST_PATH = /(^|\/)(test|tests|__tests__|spec)\/|[._-](test|spec)\.[a-z]+$/;

type Report = (message: string, severity?: Problem['severity']) => void;

/** The schema check of the front matter. Further rules run only on items that pass it. */
export function lintSchema(item: Item, report: Report): boolean {
  const validate = validator(item.kind);
  if (validate(item.meta)) return true;
  for (const message of describeErrors(validate.errors)) report(message);
  return false;
}

/** The folder path must say what the front matter says (CAT-25). */
export function lintPath(item: Item, catalog: Catalog, report: Report): void {
  const parts = item.path.split('/');
  const [, language, stack] = parts;
  const id = parts[parts.length - 1];
  if (item.meta.id !== id) report(`id "${item.meta.id}" differs from the folder name "${id}".`);
  if (item.meta.language !== language) report(`language "${item.meta.language}" differs from the folder "${language}".`);
  if (item.kind === 'stack') return;
  if (item.meta.stack !== stack) report(`stack "${item.meta.stack}" differs from the folder "${stack}".`);
  if (item.kind !== 'recipe') return;
  const category = parts[4];
  if (item.meta.category !== category) report(`category "${item.meta.category}" differs from the folder "${category}".`);
  if (!catalog.categories.some((c) => c.id === category)) report(`category "${category}" is not listed in CATEGORIES.md.`);
}

export function lintChangelog(item: ScaffoldItem | RecipeItem, report: Report): void {
  if (!item.changelog.length) return report('## Changelog has no entries.');
  if (item.changelog[0].version !== item.meta.version) {
    report(`The newest ## Changelog entry is "${item.changelog[0].version}"; it must be the current version ${item.meta.version}.`);
  }
  const seen = new Set<string>();
  for (const entry of item.changelog) {
    if (seen.has(entry.version)) report(`## Changelog lists ${entry.version} twice.`);
    seen.add(entry.version);
    if (!entry.notes.length) report(`## Changelog entry ${entry.version} has no notes.`);
  }
}

export function lintText(item: Item, report: Report): void {
  if (!item.description) report('The body needs a description under the title.');
  if (item.title && item.title !== item.meta.name) report(`The title "# ${item.title}" differs from name "${item.meta.name}".`, 'warning');
}

export function lintRecipe(item: RecipeItem, report: Report): void {
  const keys = new Set<string>();
  for (const p of item.meta.parameters ?? []) {
    if (keys.has(p.key)) report(`Parameter ${p.key} is declared twice.`);
    keys.add(p.key);
    if (p.secret && p.default !== undefined) report(`Secret parameter ${p.key} must not have a default.`);
  }
  const paths = item.files.map((f) => f.path);
  for (const p of item.meta.onlyIfMissing ?? []) if (!paths.includes(p)) report(`onlyIfMissing names ${p}, which is not under files/.`);
  for (const i of item.instructions) {
    if (!i.instruction) report(`Instruction ### ${i.target} is empty.`);
    if (i.target.startsWith('/') || i.target.split('/').includes('..')) report(`Instruction target ${i.target} must be a relative path inside the tier.`);
  }
  if ((item.meta.dependsOn ?? []).includes(item.meta.id)) report('A recipe cannot depend on itself.');
  const hasCode = item.files.length > 0 && item.meta.standardType !== 'delivery-scripts';
  if (hasCode && !paths.some((p) => TEST_PATH.test(p))) report('The recipe adds files but no test under files/ (format section 7.4).', 'warning');
}

/** Every `{{KEY}}` must be a declared parameter or a built-in placeholder. */
export function lintPlaceholders(item: ScaffoldItem | RecipeItem, report: Report): void {
  const declared = new Set([...BUILT_IN_PLACEHOLDERS, ...(item.kind === 'recipe' ? (item.meta.parameters ?? []).map((p) => p.key) : [])]);
  const texts: Array<[string, string]> = item.files.map((f) => [`files/${f.path}`, f.content]);
  texts.push(['verify', item.meta.verify.join('\n')]);
  if (item.kind === 'scaffold') texts.push(['commands', item.meta.commands.join('\n')]);
  else texts.push(...item.instructions.map((i): [string, string] => [`### ${i.target}`, i.instruction]));
  for (const [where, text] of texts) {
    for (const match of text.matchAll(PLACEHOLDER)) {
      if (!declared.has(match[1])) report(`{{${match[1]}}} in ${where} is not a declared parameter.`);
    }
  }
}
