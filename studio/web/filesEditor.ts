import type { ItemFile } from './api.js';
import { h } from './dom.js';

/** The item's `files/` folder: a tree of paths and an editor for the chosen file; add, rename and delete in place. */

interface TreeNode { name: string; path?: string; children: Map<string, TreeNode> }

function buildTree(files: ItemFile[]): TreeNode {
  const root: TreeNode = { name: '', children: new Map() };
  for (const file of files) {
    let node = root;
    const parts = file.path.split('/');
    parts.forEach((part, i) => {
      if (!node.children.has(part)) node.children.set(part, { name: part, children: new Map() });
      node = node.children.get(part)!;
      if (i === parts.length - 1) node.path = file.path;
    });
  }
  return root;
}

const validPath = (p: string) => p !== '' && !p.startsWith('/') && !p.split('/').some((s) => s === '' || s === '.' || s === '..');

export class FilesEditor {
  readonly el = h('div', { class: 'files' });
  private selected?: string;
  private message = '';
  /** Which inline form is open: adding a file, or renaming the chosen one. */
  private form: 'add' | 'rename' | undefined;

  constructor(private readonly files: ItemFile[], private readonly onChange: () => void) {
    this.selected = files[0]?.path;
    this.render();
  }

  private treeList(node: TreeNode): HTMLElement {
    const entries = [...node.children.values()].sort((a, b) => Number(!!a.path) - Number(!!b.path) || a.name.localeCompare(b.name));
    return h('ul', {}, ...entries.map((child) => child.path
      ? h('li', {}, h('button', { type: 'button', class: child.path === this.selected ? 'file selected' : 'file', title: child.path,
        onclick: () => { this.selected = child.path; this.form = undefined; this.message = ''; this.render(); } }, child.name))
      : h('li', {}, h('span', { class: 'folder' }, `${child.name}/`), this.treeList(child))));
  }

  private pathForm(label: string, initial: string, apply: (path: string) => void): HTMLElement {
    const input = h('input', { type: 'text', value: initial, placeholder: 'lib/core/example.dart', spellcheck: false, 'aria-label': 'File path inside files/' });
    const submit = () => {
      const p = input.value.trim();
      if (!validPath(p)) { this.message = 'A path is relative, inside files/, with no empty, "." or ".." part.'; return this.render(); }
      if (p !== initial && this.files.some((f) => f.path === p)) { this.message = `${p} already exists.`; return this.render(); }
      this.message = '';
      this.form = undefined;
      apply(p);
    };
    const cancel = h('button', { type: 'button', class: 'ghost', onclick: () => { this.form = undefined; this.message = ''; this.render(); } }, 'Cancel');
    window.setTimeout(() => input.focus());
    return h('form', { class: 'inline', onsubmit: (e) => { e.preventDefault(); submit(); } }, input, h('button', { type: 'submit', class: 'primary' }, label), cancel);
  }

  private current(): ItemFile | undefined {
    return this.files.find((f) => f.path === this.selected);
  }

  private editor(file: ItemFile): HTMLElement {
    let confirming = false;
    const del = h('button', { type: 'button', class: 'ghost danger', onclick: () => {
      if (!confirming) { confirming = true; del.textContent = 'Click again to delete'; return; }
      this.files.splice(this.files.indexOf(file), 1);
      this.selected = this.files[0]?.path;
      this.onChange();
      this.render();
    } }, 'Delete');
    const head = this.form === 'rename'
      ? this.pathForm('Rename', file.path, (p) => { file.path = p; this.selected = p; this.onChange(); this.render(); })
      : h('div', { class: 'file-actions' }, h('code', { class: 'file-path' }, file.path),
        h('button', { type: 'button', class: 'ghost', onclick: () => { this.form = 'rename'; this.render(); } }, 'Rename'), del);
    return h('div', { class: 'file-editor' }, head,
      h('textarea', { class: 'mono code', spellcheck: false, 'aria-label': `Content of ${file.path}`, oninput: (e) => { file.content = (e.target as HTMLTextAreaElement).value; this.onChange(); } }, file.content));
  }

  render(): void {
    const file = this.current();
    this.el.replaceChildren(
      h('div', { class: 'file-tree' },
        h('div', { class: 'file-tree-head' }, h('h3', {}, 'files/'),
          this.form === 'add' ? null : h('button', { type: 'button', class: 'ghost', onclick: () => { this.form = 'add'; this.render(); } }, '+ Add file')),
        this.form === 'add' ? this.pathForm('Add', '', (p) => { this.files.push({ path: p, content: '' }); this.selected = p; this.onChange(); this.render(); }) : null,
        this.message ? h('p', { class: 'error-text' }, this.message) : null,
        this.files.length ? this.treeList(buildTree(this.files)) : h('p', { class: 'muted' }, 'No files yet. The files are copied into the project when the item is applied.')),
      file ? this.editor(file) : h('div', { class: 'file-editor empty-files muted' }, 'Choose a file on the left, or add one.'));
  }
}
