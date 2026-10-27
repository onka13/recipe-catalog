import { api, type CatalogInfo, type EditableItem, type JsonSchema, type Kind } from './api.js';
import { changedItems } from './catalog.js';
import { changesDialog } from './changes.js';
import { clear, h, toast } from './dom.js';
import { harvestDialog, modal, newRecipeDialog } from './dialogs.js';
import { ItemEditor } from './editor.js';
import { homePage } from './home.js';
import { Sidebar } from './sidebar.js';

/** Catalog Studio's page: the item list on the left, the overview or the open item on the right; the address holds the item's path. */

const main = document.getElementById('main')!;
const sidebar = new Sidebar(document.getElementById('items')!, document.getElementById('filter') as HTMLInputElement, document.getElementById('filter-result')!);
const schemas = new Map<Kind, JsonSchema>();
let info: CatalogInfo;
let changed = new Set<string>();
let editor: ItemEditor | undefined;
let dirty = false;

const currentPath = () => decodeURIComponent(location.hash.slice(1));
const stackName = (id: string) => info.items.find((i) => i.kind === 'stack' && i.id === id)?.name ?? id;
/** The stack of the open item, so New recipe and Harvest start there. */
const currentStack = () => (editor ? info.items.find((i) => i.path === currentPath())?.stack : undefined);

async function schemaFor(kind: Kind): Promise<JsonSchema> {
  if (!schemas.has(kind)) schemas.set(kind, await api.schema(kind));
  return schemas.get(kind)!;
}

function renderSidebar(): void {
  sidebar.update({ info, active: editor ? currentPath() : '', changed });
}

/** Reads the changed files for the badge and the list's marks; git missing is shown when Changes is opened. */
async function readChanges(): Promise<void> {
  const badge = document.getElementById('changes-count')!;
  try {
    changed = changedItems(info, await api.changes());
    badge.textContent = String(changed.size);
    badge.hidden = changed.size === 0;
  } catch (error) {
    changed = new Set();
    badge.hidden = true;
    document.getElementById('changes')!.title = (error as Error).message;
  }
}

async function show(item: EditableItem): Promise<void> {
  editor = new ItemEditor(item, await schemaFor(item.kind), {
    categories: info.categories.map((c) => c.id),
    stackName,
    onDirty: (d) => { dirty = d; },
    onSaved: (path) => { toast(`Saved ${path}`); void refresh(path); },
  });
  clear(main, editor.el);
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  renderSidebar();
}

function showHome(): void {
  editor = undefined;
  clear(main, homePage(info, changed.size, {
    browse: (id) => sidebar.reveal(id),
    newRecipe: (id) => newRecipeDialog(info, id, openDraft),
    harvest: () => harvestDialog(info, undefined, () => void refresh()),
  }));
  renderSidebar();
}

async function openPath(path: string): Promise<void> {
  if (!path) return showHome();
  try { await show(await api.item(path)); } catch (error) {
    editor = undefined;
    clear(main, h('div', { class: 'empty' }, h('h2', {}, 'This item could not be opened'), h('p', { class: 'error-text' }, (error as Error).message), h('a', { href: '#' }, 'Back to the overview')));
    renderSidebar();
  }
}

async function refresh(openAfter?: string): Promise<void> {
  info = await api.catalog();
  const root = document.getElementById('root')!;
  root.textContent = info.root.split('/').filter(Boolean).pop() ?? info.root;
  root.title = info.root;
  dirty = false;
  await readChanges();
  if (openAfter !== undefined && currentPath() !== openAfter) location.hash = encodeURIComponent(openAfter);
  else await openPath(currentPath());
}

/** Leaving unsaved changes asks first, in the page (no browser dialog). */
function guard(action: () => void): void {
  if (!dirty) return action();
  const dialog = modal('Discard unsaved changes?',
    h('p', {}, 'The open item has changes that are not saved. They are lost if you continue.'),
    h('div', { class: 'dialog-actions' },
      h('button', { type: 'button', class: 'primary', onclick: () => dialog.close() }, 'Keep editing'),
      h('button', { type: 'button', class: 'danger', onclick: () => { dialog.close(); dirty = false; action(); } }, 'Discard changes')));
}

function openDraft(item: EditableItem): void {
  history.replaceState(null, '', '#');
  lastHash = '';
  void show(item);
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
// A new draft has no address, so a link to the overview would not change the hash: handle it here.
document.addEventListener('click', (e) => {
  if (location.hash || !(e.target instanceof Element) || !e.target.closest('a[href="#"]')) return;
  e.preventDefault();
  if (editor) guard(showHome);
});
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void editor?.save(); }
  if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
    e.preventDefault();
    document.getElementById('filter')!.focus();
  }
});
document.getElementById('new-recipe')!.addEventListener('click', () => guard(() => newRecipeDialog(info, currentStack(), openDraft)));
document.getElementById('harvest')!.addEventListener('click', () => harvestDialog(info, currentStack(), () => void refresh()));
document.getElementById('changes')!.addEventListener('click', () => void changesDialog(info, (path) => { location.hash = encodeURIComponent(path); }));
void refresh().catch((error: Error) => clear(main, h('div', { class: 'empty' }, h('h2', {}, 'The catalog could not be read'), h('p', { class: 'error-text' }, error.message))));
