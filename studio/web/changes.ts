import { api, type CatalogInfo } from './api.js';
import { itemOfFile, STATUS } from './catalog.js';
import { h, toast } from './dom.js';
import { modal } from './dialogs.js';

/** The changes for the pull request: each changed file with its status, its item and its own diff. */

const COMMIT = 'git add stacks CATEGORIES.md && git commit -s -m "feat(recipe): ..."';

function diffLines(diff: string): HTMLElement {
  return h('pre', { class: 'diff' }, ...diff.split('\n').map((line) => {
    const cls = line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') ? 'meta' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : '';
    return h('span', { class: cls }, `${line}\n`);
  }));
}

/** Splits a unified diff into one part per file, keyed by the file's path (the `b/` side). */
function perFile(diff: string): Map<string, string> {
  const parts = new Map<string, string>();
  for (const part of diff.split(/^(?=diff --git )/m).filter(Boolean)) {
    const file = / b\/(.+)$/m.exec(part.split('\n')[0])?.[1];
    if (file) parts.set(file, part.trimEnd());
  }
  return parts;
}

const counts = (diff: string) => {
  const lines = diff.split('\n');
  return { add: lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length, del: lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length };
};

export async function changesDialog(info: CatalogInfo, openItem: (path: string) => void): Promise<void> {
  const body = h('div', {}, h('p', { class: 'muted' }, 'Reading git ...'));
  const dialog = modal('Changes for the pull request', body);
  try {
    const changes = await api.changes();
    if (!changes.files.length) return body.replaceChildren(h('p', { class: 'empty-note' }, 'Nothing has changed under stacks/ or in CATEGORIES.md since the last commit.'));
    const diffs = perFile(changes.diff);
    const many = changes.files.length > 4;
    body.replaceChildren(
      h('p', { class: 'muted' }, `${changes.files.length} changed file${changes.files.length === 1 ? '' : 's'}. Commit them with a sign-off, then push and open the pull request:`),
      h('div', { class: 'copy-row' }, h('code', {}, COMMIT),
        h('button', { type: 'button', onclick: () => void navigator.clipboard.writeText(COMMIT).then(() => toast('Copied.'), (e: Error) => toast(`Not copied: ${e.message}`, 'error')) }, 'Copy')),
      ...changes.files.map((f) => {
        const diff = diffs.get(f.path) ?? '';
        const { add, del } = counts(diff);
        const item = itemOfFile(info, f.path);
        return h('details', { class: 'change', open: !many },
          h('summary', {},
            h('span', { class: `status s-${f.status === '??' ? 'new' : f.status.toLowerCase()}` }, STATUS[f.status] ?? f.status),
            h('code', { class: 'change-path' }, f.path),
            h('span', { class: 'counts' }, h('span', { class: 'plus' }, `+${add}`), ' ', h('span', { class: 'minus' }, `-${del}`)),
            item ? h('button', { type: 'button', class: 'ghost', onclick: (e) => { e.preventDefault(); dialog.close(); openItem(item.path); } }, 'Open item') : null),
          diff ? diffLines(diff) : h('p', { class: 'muted' }, 'No text diff for this file.'));
      }));
  } catch (error) { body.replaceChildren(h('p', { class: 'error-text' }, (error as Error).message)); }
}
