import { api, type CatalogInfo, type EditableItem } from './api.js';
import { h } from './dom.js';
import { jobView } from './jobView.js';

/** In-page dialogs: New recipe, Harvest, and the changes for the pull request. */

export function modal(title: string, ...body: HTMLElement[]): { el: HTMLElement; close: () => void } {
  const backdrop = h('div', { class: 'backdrop' });
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.append(h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'dialog-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'ghost', onclick: close, 'aria-label': 'Close' }, 'Close')),
    ...body));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.body.append(backdrop);
  return { el: backdrop, close };
}

const stacksOf = (info: CatalogInfo) => info.items.filter((i) => i.kind === 'stack');
const select = (options: Array<[string, string]>) => h('select', { required: true }, ...options.map(([value, label]) => h('option', { value }, label)));

export function newRecipeDialog(info: CatalogInfo, open: (item: EditableItem) => void): void {
  const stack = select(stacksOf(info).map((s) => [s.id, `${s.id} (${s.name})`]));
  const category = select(info.categories.map((c) => [c.id, `${c.id}: ${c.meaning}`]));
  const id = h('input', { type: 'text', placeholder: 'kebab-case-id', required: true, spellcheck: false });
  const error = h('p', { class: 'error-text' });
  const dialog = modal('New recipe', h('form', { class: 'stack-form', onsubmit: async (e) => {
    e.preventDefault();
    try {
      const item = await api.newRecipe({ stack: stack.value, category: category.value, id: id.value.trim() });
      dialog.close();
      open(item);
    } catch (err) { error.textContent = (err as Error).message; }
  } },
  h('label', {}, 'Stack', stack), h('label', {}, 'Category', category), h('label', {}, 'Id', id),
  h('p', { class: 'muted' }, 'The folder is stacks/<language>/<stack>/recipes/<category>/<id>/, at version 1.0.0. Nothing is written until you save.'),
  error, h('button', { type: 'submit', class: 'primary' }, 'Create draft')));
}

export function harvestDialog(info: CatalogInfo, onDone: () => void): void {
  const project = h('input', { type: 'text', placeholder: '/absolute/path/to/your/project', required: true, spellcheck: false });
  const capability = h('input', { type: 'text', placeholder: 'AdMob ads with consent', required: true });
  const stack = select(stacksOf(info).map((s) => [s.id, s.id]));
  const category = select([['', 'Let the agent choose'], ...info.categories.map((c): [string, string] => [c.id, c.id])]);
  const agent = select([['claude', 'Claude Code'], ['codex', 'OpenAI Codex'], ['copilot', 'GitHub Copilot']]);
  const agentBin = h('input', { type: 'text', placeholder: 'Agent executable (optional, absolute path)', spellcheck: false });
  const agentModel = h('input', { type: 'text', placeholder: 'Model (optional, e.g. haiku)', spellcheck: false });
  const out = h('div', {});
  modal('Harvest a recipe from your project', h('form', { class: 'stack-form', onsubmit: async (e) => {
    e.preventDefault();
    try {
      const job = await api.startJob({ command: 'harvest', project: project.value.trim(), capability: capability.value.trim(), stack: stack.value, category: category.value, agent: agent.value, agentBin: agentBin.value.trim(), agentModel: agentModel.value.trim() });
      out.replaceChildren(jobView(job, onDone));
    } catch (err) { out.replaceChildren(h('p', { class: 'error-text' }, (err as Error).message)); }
  } },
  h('label', {}, 'Project folder', project), h('label', {}, 'Capability', capability),
  h('div', { class: 'row' }, h('label', {}, 'Stack', stack), h('label', {}, 'Category', category), h('label', {}, 'Agent', agent)), agentBin, agentModel,
  h('p', { class: 'muted' }, 'Your coding agent reads the project and writes the recipe; it is checked and filed under stacks/ only when the lint and the secret check pass. The project is not changed.'),
  h('button', { type: 'submit', class: 'primary' }, 'Harvest')), out);
}

/** A unified diff with added and removed lines marked, for reading before a pull request. */
function diffView(diff: string): HTMLElement {
  return h('pre', { class: 'diff' }, ...diff.split('\n').map((line) => {
    const cls = line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') ? 'meta' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : '';
    return h('span', { class: cls }, `${line}\n`);
  }));
}

export async function changesDialog(): Promise<void> {
  const body = h('div', {}, h('p', { class: 'muted' }, 'Reading git ...'));
  modal('Changes for the pull request', body);
  try {
    const changes = await api.changes();
    if (!changes.files.length) return body.replaceChildren(h('p', {}, 'No changes under stacks/ or in CATEGORIES.md.'));
    body.replaceChildren(
      h('ul', { class: 'changed' }, ...changes.files.map((f) => h('li', {}, h('code', { class: 'status' }, f.status), ` ${f.path}`))),
      h('p', { class: 'muted' }, 'Commit with a sign-off: git add stacks && git commit -s -m "feat(recipe): ..."'),
      diffView(changes.diff));
  } catch (error) { body.replaceChildren(h('p', { class: 'error-text' }, (error as Error).message)); }
}
