import { api, type EditableItem, type JsonSchema, type Problem } from './api.js';
import { debounce, h } from './dom.js';
import { FilesEditor } from './filesEditor.js';
import { jobView } from './jobView.js';
import { schemaForm } from './schemaForm.js';

/**
 * One item's editor (CAT-28): front matter form, Markdown sections, files, the live lint that blocks the save, and
 * the check of FORMAT.md 7.3 with the contributor's agent.
 */

export interface EditorContext {
  categories: string[];
  /** Called with the saved item's path, so the list and the address can follow. */
  onSaved: (path: string) => void;
  onDirty: (dirty: boolean) => void;
}

const AGENTS = ['', 'claude', 'codex', 'copilot'];
const DEFAULT_IMAGE = 'recipe-catalog-toolchain';

function markdownArea(label: string, hint: string, value: string, set: (v: string) => void, onChange: () => void): HTMLElement {
  return h('section', { class: 'card' },
    h('h3', {}, label), h('p', { class: 'muted' }, hint),
    h('textarea', { class: 'mono', rows: Math.min(24, Math.max(4, value.split('\n').length + 1)), spellcheck: false,
      oninput: (e) => { set((e.target as HTMLTextAreaElement).value); onChange(); } }, value));
}

function problemList(problems: Problem[] | undefined, pending: boolean): HTMLElement {
  if (!problems) return h('div', { class: 'problems muted' }, 'Checking ...');
  const errors = problems.filter((p) => p.severity === 'error').length;
  const head = problems.length ? `${errors} error(s), ${problems.length - errors} warning(s)${pending ? ' (checking again ...)' : ''}` : `No problems${pending ? ' (checking again ...)' : ''}`;
  return h('div', { class: problems.length ? 'problems has-problems' : 'problems ok' },
    h('strong', {}, head),
    problems.length ? h('ul', {}, ...problems.map((p) => h('li', { class: p.severity }, h('span', { class: 'sev' }, p.severity), ` ${p.path}: ${p.message}`))) : null);
}

function verifyPanel(item: EditableItem): HTMLElement {
  const agent = h('select', {}, ...AGENTS.map((a) => h('option', { value: a }, a || 'none (stop before instructions)')));
  const agentBin = h('input', { type: 'text', placeholder: 'Agent executable (optional, absolute path)', spellcheck: false });
  const agentModel = h('input', { type: 'text', placeholder: 'Model (optional, e.g. haiku)', spellcheck: false });
  const image = h('input', { type: 'text', value: DEFAULT_IMAGE, spellcheck: false });
  const out = h('div', {});
  const run = async () => {
    try {
      const job = await api.startJob({ command: 'verify', id: String(item.meta.id), image: image.value.trim(), agent: agent.value, agentBin: agentBin.value.trim(), agentModel: agentModel.value.trim() });
      out.replaceChildren(jobView(job));
    } catch (error) { out.replaceChildren(h('p', { class: 'error-text' }, (error as Error).message)); }
  };
  return h('section', { class: 'card' },
    h('h3', {}, 'Verify'),
    h('p', { class: 'muted' }, 'Applies the saved item to a fresh project of its stack in the toolchain image, lets the agent carry out its instructions, then builds and tests (FORMAT.md 7.3). Save first.'),
    h('div', { class: 'row' }, h('label', {}, 'Agent ', agent), h('label', {}, 'Image ', image), agentBin, agentModel, h('button', { type: 'button', onclick: run }, 'Run check')),
    out);
}

export class ItemEditor {
  readonly el = h('div', { class: 'editor' });
  private item: EditableItem;
  private original: string;
  private revision = 0;
  private lint: { revision: number; problems: Problem[] } | undefined;
  private readonly header = h('div', { class: 'editor-head' });
  private readonly problems = h('div', {});
  private readonly lintSoon = debounce(() => void this.runLint(), 400);

  constructor(item: EditableItem, private readonly schema: JsonSchema, private readonly ctx: EditorContext) {
    this.item = item;
    this.original = item.isNew ? '' : JSON.stringify(item);
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

  private async save(): Promise<void> {
    const result = await api.save(this.item).catch((error: Error) => ({ saved: false, path: this.item.path, problems: [{ path: this.item.path, message: error.message, severity: 'error' as const }] }));
    if (!result.saved || !('item' in result) || !result.item) {
      this.lint = { revision: this.revision, problems: result.problems };
      return this.renderHeader();
    }
    this.item = result.item;
    this.original = JSON.stringify(result.item);
    this.ctx.onDirty(false);
    this.ctx.onSaved(result.path);
  }

  private renderHeader(): void {
    const { kind, meta, isNew } = this.item;
    const state = isNew ? 'New, not saved' : this.dirty ? 'Unsaved changes' : 'Saved';
    this.header.replaceChildren(
      h('div', {}, h('h2', {}, `${String(meta.name ?? meta.id)}`), h('code', { class: 'path' }, this.item.path || '(path from the front matter)')),
      h('div', { class: 'head-actions' },
        h('span', { class: 'chip' }, `${kind}${meta.version ? ` ${String(meta.version)}` : ''}`),
        h('span', { class: this.dirty ? 'chip dirty' : 'chip' }, state),
        h('button', { type: 'button', class: 'primary', disabled: !this.canSave(), onclick: () => void this.save(),
          title: this.canSave() ? 'Write this item\'s folder' : 'Fix the errors (or change something) to save' }, 'Save')));
    this.problems.replaceChildren(problemList(this.lint?.problems, this.lint?.revision !== this.revision));
  }

  private build(): void {
    const it = this.item;
    const suggestions = { category: this.ctx.categories };
    const parts: Array<HTMLElement | null> = [
      this.header, this.problems,
      h('section', { class: 'card' }, h('h3', {}, 'Front matter'), schemaForm(this.schema, { meta: it.meta, onChange: this.changed, suggestions })),
      h('section', { class: 'card' }, h('h3', {}, 'Title'),
        h('input', { type: 'text', value: it.title, oninput: (e) => { it.title = (e.target as HTMLInputElement).value; this.changed(); } })),
      markdownArea('Description', 'What the item does and when to use it.', it.description, (v) => { it.description = v; }, this.changed),
      it.kind === 'recipe' ? markdownArea('Instructions', 'One "### <project file>" per existing file a coding agent changes.', it.instructions, (v) => { it.instructions = v; }, this.changed) : null,
      it.kind === 'recipe' ? markdownArea('Conventions', 'One "### <glob pattern>" per rule for code written later.', it.conventions, (v) => { it.conventions = v; }, this.changed) : null,
      ...it.extraSections.map((s) => markdownArea(`## ${s.title}`, 'A section tools keep as it is.', s.text, (v) => { s.text = v; }, this.changed)),
      it.kind === 'stack' ? null : markdownArea('Changelog', 'Newest first: "### <version>" and "- " notes. The newest entry is the current version.', it.changelog, (v) => { it.changelog = v; }, this.changed),
      it.kind === 'stack' ? null : h('section', { class: 'card' }, h('h3', {}, 'Files'), new FilesEditor(it.files, this.changed).el),
      it.kind === 'stack' || it.isNew ? null : verifyPanel(it),
    ];
    this.el.replaceChildren(...parts.filter((p): p is HTMLElement => p !== null));
    this.renderHeader();
  }
}
