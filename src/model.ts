/** The in-memory form of catalog items. The front matter (`meta`) is checked against `schema/*.schema.json` by the lint. */

export interface StackMeta {
  schemaVersion: 1;
  id: string;
  name: string;
  language: string;
  projectType: string;
  requiredTools: string[];
  deliveryScriptsRecipe: string;
  defaultScaffold: string;
  /** Adds one package to a project of the stack; `{{NAME}}` and `{{VERSION}}` are filled in. */
  addPackage: string;
  addDevPackage: string;
}

export interface Parameter {
  key: string;
  label: string;
  description?: string;
  default?: string;
  secret: boolean;
}

export interface Package {
  name: string;
  version: string;
  dev: boolean;
}

export interface ScaffoldMeta {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  language: string;
  stack: string;
  markerFile: string;
  requiredTools: string[];
  commands: string[];
  verify: string[];
  mandatoryRecipes: string[];
}

export interface RecipeMeta {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  language: string;
  stack: string;
  category: string;
  standardType: string;
  interfacePort?: string;
  order: number;
  tags?: string[];
  platformPermissions?: string[];
  dependsOn?: string[];
  parameters?: Parameter[];
  packages?: Package[];
  onlyIfMissing?: string[];
  verify: string[];
}

export interface ItemFile {
  /** Relative to the item's `files/` folder; the same path the file gets in the project's tier folder. */
  path: string;
  content: string;
}

export interface ChangelogEntry {
  version: string;
  notes: string[];
}

export interface Instruction {
  /** The project file a coding agent edits. */
  target: string;
  instruction: string;
}

/** A rule for code written after the recipe is applied, for the files a pattern matches (`## Conventions`). */
export interface Convention {
  pattern: string;
  rule: string;
}

/** A level-2 body section that tools do not interpret; kept so that writing an item back loses nothing. */
export interface Section {
  title: string;
  text: string;
}

interface ItemBase {
  /** The item's folder, relative to the catalog root, with `/` separators. */
  path: string;
  /** The `# ` heading of the body. */
  title: string;
  description: string;
  extraSections: Section[];
}

export interface StackItem extends ItemBase {
  kind: 'stack';
  meta: StackMeta;
}

export interface ScaffoldItem extends ItemBase {
  kind: 'scaffold';
  meta: ScaffoldMeta;
  changelog: ChangelogEntry[];
  files: ItemFile[];
}

export interface RecipeItem extends ItemBase {
  kind: 'recipe';
  meta: RecipeMeta;
  instructions: Instruction[];
  conventions: Convention[];
  changelog: ChangelogEntry[];
  files: ItemFile[];
}

export type Item = StackItem | ScaffoldItem | RecipeItem;

export interface Category {
  id: string;
  meaning: string;
}

export interface Catalog {
  root: string;
  categories: Category[];
  stacks: StackItem[];
  scaffolds: ScaffoldItem[];
  recipes: RecipeItem[];
}

export interface Problem {
  /** The item folder or file the problem is about, relative to the catalog root. */
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export const ITEM_FILE: Record<Item['kind'], string> = { stack: 'STACK.md', scaffold: 'SCAFFOLD.md', recipe: 'RECIPE.md' };

/** Placeholders every consumer fills in without a parameter declaring them. */
export const BUILT_IN_PLACEHOLDERS = ['PACKAGE_NAME', 'PROJECT_NAME'];

export const MAX_FILE_BYTES = 1024 * 1024;
