import { api, type EditableItem, type JsonSchema, type Problem } from './api.js';
import { debounce, h, toast } from './dom.js';
import { lintSummary, markdownArea, problemList, verifyPanel } from './editorParts.js';
import { FilesEditor } from './filesEditor.js';
import { schemaForm } from './schemaForm.js';
import { applyBump, bumped, type Bump } from './version.js';

/**
 * One item's editor (CAT-28): a sticky header with the save state, the lint result and Save; then tabs for the
 * front matter and description, the Markdown sections, the files, the changelog and the check of FORMAT.md 7.3.
 * The live lint blocks the save.
 */

export interface EditorContext {
  categories: string[];
  stackName: (stackId: string) => string;
  /** Called with the saved item's path, so the list and the address can follow. */
  onSaved: (path: string) => void;
  onDirty: (dirty: boolean) => void;
}

interface Tab { id: string; label: string; panel: HTMLElement }

const BUMPS: Bump[] = ['patch', 'minor', 'major'];

export class ItemEditor {
  readonly el = h('div', { class: 'editor' });
  private item: EditableItem;
  private original: string;
  private savedVersion: string;
  private revision = 0;
  private activeTab = 'overview';
  private lint: { revision: number; problems: Problem[] } | undefined;
  private readonly titleRow = h('div', { class: 'editor-title' });
  private readonly tabBar = h('div', { class: 'tabs', role: 'tablist' });
  private readonly problems = h('div', {});
  private readonly lintSoon = debounce(() => void this.runLint(), 400);

  constructor(item: EditableItem, private readonly schema: JsonSchema, private readonly ctx: EditorContext) {
    this.item = item;
    this.original = item.isNew ? '' : JSON.stringify(item);
    this.savedVersion = String(item.meta.version ?? '');
    this.build();
    void this.runLint();
  }

  get dirty(): boolean { return JSON.stringify(this.item) !== this.original; }

  private changed = () => {
    this.revision++;
    this.ctx.onDirty(this.dirty);
    this.renderHeader();
    this.lintSoon();
  };

  private async runLint(): Promise<void> {
    const revision = this.revision;
    try {
      const result = await api.lint(this.item);
      if (revision !== this.revision) return;
      this.lint = { revision, problems: result.problems };
    } catch (error) {
      this.lint = { revision, problems: [{ path: this.item.path, message: (error as Error).message, severity: 'error' }] };
    }
    this.renderHeader();
  }

  private canSave(): boolean {
    return this.dirty && this.lint?.revision === this.revision && !this.lint.problems.some((p) => p.severity === 'error');
  }

  /** Saves when the lint allows it; the Save button and Ctrl+S / Cmd+S both come here. */
  async save(): Promise<void> {
    if (!this.dirty) return;
    if (!this.canSave()) return toast(this.lint?.revision === this.revision ? 'Not saved: fix the errors first.' : 'Not saved yet: the check is still running.', 'error');
    const result = await api.save(this.item).catch((error: Error) => ({ saved: false, path: this.item.path, problems: [{ path: this.item.path, message: error.message, severity: 'error' as const }] }));
    if (!result.saved || !('item' in result) || !result.item) {
      this.lint = { revision: this.revision, problems: result.problems };
      toast('Not saved: the item has errors.', 'error');
      return this.renderHeader();
    }
    this.item = result.item;
    this.original = JSON.stringify(result.item);
    this.savedVersion = String(result.item.meta.version ?? '');
    this.ctx.onDirty(false);
    this.ctx.onSaved(result.path);
  }

  private bump(kind: Bump): void {
    if (!applyBump(this.item, this.savedVersion, kind)) return toast(`${this.savedVersion} is not a version of the form x.y.z.`, 'error');
    this.activeTab = 'changelog';
    this.build();
    this.changed();
    const area = this.el.querySelector<HTMLTextAreaElement>('textarea[data-section="changelog"]');
    const caret = this.item.changelog.indexOf('\n- ') + 3;
    area?.focus();
    if (caret > 2) area?.setSelectionRange(caret, caret);
  }

  private versionMenu(): HTMLElement | null {
    if (this.item.kind === 'stack' || this.item.isNew || !bumped(this.savedVersion, 'patch')) return null;
    const menu = h('details', { class: 'menu' }, h('summary', { class: 'button', title: 'Raise the version and add its changelog entry' }, 'New version'));
    menu.append(h('div', { class: 'menu-list' }, ...BUMPS.map((b) => h('button', { type: 'button', onclick: () => { menu.open = false; this.bump(b); } },
      h('strong', {}, bumped(this.savedVersion, b)!), h('span', { class: 'muted' }, ` ${b}`)))));
    return menu;
  }

  private renderHeader(): void {
    const { kind, meta, isNew } = this.item;
    const state = isNew ? 'New, not saved' : this.dirty ? 'Unsaved changes' : 'Saved';
    const lint = lintSummary(this.lint?.problems, this.lint?.revision !== this.revision);
    const crumbs = [this.ctx.stackName(String(kind === 'stack' ? meta.id : meta.stack)), kind === 'stack' ? 'Stack settings' : kind === 'scaffold' ? 'Scaffolds' : 'Recipes', kind === 'recipe' ? String(meta.category ?? '') : ''];
    this.titleRow.replaceChildren(
      h('div', { class: 'title-block' },
        h('div', { class: 'crumbs' }, crumbs.filter(Boolean).join(' › ')),
        h('h2', {}, String(meta.name || meta.id || 'Untitled')),
        h('code', { class: 'path', title: 'The item\'s folder' }, this.item.path || '(path from the front matter)')),
      h('div', { class: 'head-actions' },
        h('span', { class: 'chip' }, `${kind}${meta.version ? ` ${String(meta.version)}` : ''}`),
        h('span', { class: lint.cls, title: 'The format lint, run on every change' }, lint.text),
        h('span', { class: this.dirty ? 'chip dirty' : 'chip' }, state),
        this.versionMenu(),
        h('button', { type: 'button', class: 'primary', disabled: !this.canSave(), onclick: () => void this.save(),
          title: this.canSave() ? 'Write this item\'s folder (Ctrl+S)' : this.dirty ? 'Fix the errors to save' : 'Nothing to save' }, 'Save')));
    this.problems.replaceChildren(...[problemList(this.lint?.problems, this.item.path)].filter((p): p is HTMLElement => !!p));
    const files = this.tabBar.querySelector('[data-tab="files"] .count');
    if (files) files.textContent = String(this.item.files.length);
  }

  private tabs(): Tab[] {
    const it = this.item;
    const area = (label: string, hint: string, value: string, set: (v: string) => void, section?: string) => markdownArea(label, hint, value, set, this.changed, section);
    const overview = h('div', {},
      h('section', { class: 'card' }, h('h3', {}, 'Title'),
        h('input', { type: 'text', value: it.title, 'aria-label': 'Title', oninput: (e) => { it.title = (e.target as HTMLInputElement).value; this.changed(); } })),
      area('Description', 'What the item does and when to use it.', it.description, (v) => { it.description = v; }),
      h('section', { class: 'card' }, h('h3', {}, 'Front matter'), h('p', { class: 'muted' }, 'The fields at the top of the item\'s Markdown file. Fields marked * are required.'),
        schemaForm(this.schema, { meta: it.meta, onChange: this.changed, suggestions: { category: this.ctx.categories } })));
    const list: Array<Tab | null> = [
      { id: 'overview', label: 'Overview', panel: overview },
      it.kind === 'recipe' ? { id: 'instructions', label: 'Instructions', panel: area('Instructions', 'One "### <project file>" per existing file a coding agent changes when the recipe is applied.', it.instructions, (v) => { it.instructions = v; }) } : null,
      it.kind === 'recipe' ? { id: 'conventions', label: 'Conventions', panel: area('Conventions', 'One "### <glob pattern>" per rule for code written later.', it.conventions, (v) => { it.conventions = v; }) } : null,
      it.kind === 'stack' ? null : { id: 'files', label: 'Files', panel: h('section', { class: 'card' }, new FilesEditor(it.files, this.changed).el) },
      it.kind === 'stack' ? null : { id: 'changelog', label: 'Changelog', panel: area('Changelog', 'Newest first: "### <version>" and "- " notes. The newest entry is the current version; "New version" adds one.', it.changelog, (v) => { it.changelog = v; }, 'changelog') },
      it.extraSections.length ? { id: 'other', label: 'Other sections', panel: h('div', {}, ...it.extraSections.map((s) => area(`## ${s.title}`, 'A section tools keep as it is.', s.text, (v) => { s.text = v; }))) } : null,
      it.kind === 'stack' ? null : { id: 'verify', label: 'Verify', panel: verifyPanel(it, () => this.dirty) },
    ];
    return list.filter((t): t is Tab => t !== null);
  }

  private build(): void {
    const tabs = this.tabs();
    if (!tabs.some((t) => t.id === this.activeTab)) this.activeTab = 'overview';
    const select = (id: string) => {
      this.activeTab = id;
      for (const t of tabs) t.panel.hidden = t.id !== id;
      for (const b of this.tabBar.querySelectorAll<HTMLButtonElement>('[role=tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === id));
    };
    this.tabBar.replaceChildren(...tabs.map((t) => h('button', { type: 'button', role: 'tab', 'data-tab': t.id, onclick: () => select(t.id) },
      t.label, t.id === 'files' ? h('span', { class: 'count' }, String(this.item.files.length)) : null)));
    this.tabBar.hidden = tabs.length < 2;
    for (const t of tabs) { t.panel.classList.add('tab-panel'); t.panel.setAttribute('role', 'tabpanel'); }
    this.el.replaceChildren(h('div', { class: 'editor-head' }, this.titleRow, this.problems, this.tabBar), ...tabs.map((t) => t.panel));
    select(this.activeTab);
    this.renderHeader();
  }
}
