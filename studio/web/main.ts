import { api, type CatalogInfo, type EditableItem, type ItemSummary, type JsonSchema, type Kind } from './api.js';
import { clear, h } from './dom.js';
import { changesDialog, harvestDialog, modal, newRecipeDialog } from './dialogs.js';
import { ItemEditor } from './editor.js';

/** Catalog Studio's page: the item list on the left, the open item on the right; the address holds the item's path. */

const sidebar = document.getElementById('items')!;
const main = document.getElementById('main')!;
const filter = document.getElementById('filter') as HTMLInputElement;
const schemas = new Map<Kind, JsonSchema>();
let info: CatalogInfo;
let dirty = false;

async function schemaFor(kind: Kind): Promise<JsonSchema> {
  if (!schemas.has(kind)) schemas.set(kind, await api.schema(kind));
  return schemas.get(kind)!;
}

function itemLink(item: ItemSummary): HTMLElement {
  const active = decodeURIComponent(location.hash.slice(1)) === item.path;
  return h('li', {}, h('a', { href: `#${encodeURIComponent(item.path)}`, class: active ? 'active' : undefined, title: item.path },
    item.kind === 'stack' ? 'STACK.md' : item.id, item.version ? h('span', { class: 'version' }, item.version) : null));
}

function renderList(): void {
  const text = filter.value.trim().toLowerCase();
  const match = (i: ItemSummary) => !text || i.path.toLowerCase().includes(text) || i.name.toLowerCase().includes(text);
  const groups = info.items.filter((i) => i.kind === 'stack').map((stack) => {
    const own = info.items.filter((i) => i.stack === stack.id && match(i));
    const by = (label: string, list: ItemSummary[]) => list.length ? h('div', {}, h('h4', {}, label), h('ul', {}, ...list.map(itemLink))) : null;
    const categories = [...new Set(own.filter((i) => i.kind === 'recipe').map((i) => i.category!))].sort();
    return h('details', { open: true }, h('summary', {}, stack.id),
      by('Stack', own.filter((i) => i.kind === 'stack')), by('Scaffolds', own.filter((i) => i.kind === 'scaffold')),
      ...categories.map((c) => by(`Recipes / ${c}`, own.filter((i) => i.kind === 'recipe' && i.category === c))));
  });
  clear(sidebar, ...groups);
}

async function show(item: EditableItem): Promise<void> {
  const editor = new ItemEditor(item, await schemaFor(item.kind), {
    categories: info.categories.map((c) => c.id),
    onDirty: (d) => { dirty = d; },
    onSaved: (path) => void refresh(path),
  });
  clear(main, editor.el);
  renderList();
}

async function openPath(path: string): Promise<void> {
  if (!path) { clear(main, h('div', { class: 'empty' }, h('h2', {}, 'Choose an item'), h('p', {}, 'Or start a new recipe, or harvest one from your own project.'))); return; }
  try { await show(await api.item(path)); } catch (error) { clear(main, h('p', { class: 'error-text' }, (error as Error).message)); }
}

async function refresh(openAfter?: string): Promise<void> {
  info = await api.catalog();
  document.getElementById('root')!.textContent = info.root;
  dirty = false;
  if (openAfter !== undefined && decodeURIComponent(location.hash.slice(1)) !== openAfter) location.hash = encodeURIComponent(openAfter);
  else await openPath(decodeURIComponent(location.hash.slice(1)));
}

/** Leaving unsaved changes asks first, in the page (no browser dialog). */
function guard(action: () => void): void {
  if (!dirty) return action();
  const dialog = modal('Discard unsaved changes?',
    h('p', {}, 'The open item has changes that are not saved.'),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'danger', onclick: () => { dialog.close(); dirty = false; action(); } }, 'Discard changes'),
      h('button', { type: 'button', onclick: () => dialog.close() }, 'Keep editing')));
}

let lastHash = location.hash;
window.addEventListener('hashchange', () => {
  if (location.hash === lastHash) return;
  const target = location.hash;
  if (dirty) { history.replaceState(null, '', lastHash); guard(() => { lastHash = target; location.hash = target; void openPath(decodeURIComponent(target.slice(1))); }); return; }
  lastHash = target;
  void openPath(decodeURIComponent(target.slice(1)));
});
window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
filter.addEventListener('input', renderList);
document.getElementById('new-recipe')!.addEventListener('click', () => guard(() => newRecipeDialog(info, (item) => { history.replaceState(null, '', '#'); lastHash = ''; void show(item); })));
document.getElementById('harvest')!.addEventListener('click', () => harvestDialog(info, () => void refresh()));
document.getElementById('changes')!.addEventListener('click', () => void changesDialog());
void refresh().catch((error: Error) => clear(main, h('p', { class: 'error-text' }, error.message)));
