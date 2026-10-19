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

  constructor(private readonly files: ItemFile[], private readonly onChange: () => void) {
    this.selected = files[0]?.path;
    this.render();
  }

  private treeList(node: TreeNode): HTMLElement {
    const entries = [...node.children.values()].sort((a, b) => Number(!!a.path) - Number(!!b.path) || a.name.localeCompare(b.name));
    return h('ul', {}, ...entries.map((child) => child.path
      ? h('li', {}, h('button', { type: 'button', class: child.path === this.selected ? 'file selected' : 'file', onclick: () => { this.selected = child.path; this.render(); } }, child.name))
      : h('li', {}, h('span', { class: 'folder' }, `${child.name}/`), this.treeList(child))));
  }

  private pathForm(label: string, initial: string, apply: (path: string) => void): HTMLElement {
    const input = h('input', { type: 'text', value: initial, placeholder: 'lib/core/example.dart', spellcheck: false });
    const submit = () => {
      const p = input.value.trim();
      if (!validPath(p)) { this.message = 'A path is relative, inside files/, with no empty, "." or ".." part.'; return this.render(); }
      if (this.files.some((f) => f.path === p)) { this.message = `${p} already exists.`; return this.render(); }
      this.message = '';
      apply(p);
    };
    return h('form', { class: 'inline', onsubmit: (e) => { e.preventDefault(); submit(); } }, input, h('button', { type: 'submit' }, label));
  }

  private current(): ItemFile | undefined {
    return this.files.find((f) => f.path === this.selected);
  }

  private editor(file: ItemFile): HTMLElement {
    let confirming = false;
    const del = h('button', { type: 'button', class: 'ghost danger', onclick: () => {
      if (!confirming) { confirming = true; del.textContent = `Confirm: delete ${file.path}`; return; }
      this.files.splice(this.files.indexOf(file), 1);
      this.selected = this.files[0]?.path;
      this.onChange();
      this.render();
    } }, 'Delete file');
    return h('div', { class: 'file-editor' },
      h('div', { class: 'file-actions' },
        this.pathForm('Rename', file.path, (p) => { file.path = p; this.selected = p; this.onChange(); this.render(); }), del),
      h('textarea', { class: 'mono code', spellcheck: false, oninput: (e) => { file.content = (e.target as HTMLTextAreaElement).value; this.onChange(); } }, file.content));
  }

  render(): void {
    const file = this.current();
    this.el.replaceChildren(
      h('div', { class: 'file-tree' },
        this.files.length ? this.treeList(buildTree(this.files)) : h('p', { class: 'muted' }, 'No files yet.'),
        this.pathForm('Add file', '', (p) => { this.files.push({ path: p, content: '' }); this.selected = p; this.onChange(); this.render(); }),
        this.message ? h('p', { class: 'error-text' }, this.message) : null),
      file ? this.editor(file) : h('div', { class: 'file-editor muted' }, 'Choose a file or add one.'));
  }
}
