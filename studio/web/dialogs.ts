import { api, type CatalogInfo, type EditableItem } from './api.js';
import { stacksOf } from './catalog.js';
import { h } from './dom.js';
import { jobView } from './jobView.js';

/** In-page dialogs: the shared modal, New recipe and Harvest. */

export function modal(title: string, ...body: HTMLElement[]): { el: HTMLElement; close: () => void } {
  const backdrop = h('div', { class: 'backdrop' });
  const before = document.activeElement as HTMLElement | null;
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); before?.focus(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.append(h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'dialog-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'ghost icon', onclick: close, 'aria-label': 'Close', title: 'Close (Esc)' }, '×')),
    ...body));
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  document.body.append(backdrop);
  backdrop.querySelector<HTMLElement>('.dialog input, .dialog select, .dialog textarea, .dialog .primary')?.focus();
  return { el: backdrop, close };
}

const select = (options: Array<[string, string]>, value?: string) =>
  h('select', { required: true }, ...options.map(([v, label]) => h('option', { value: v, selected: v === value }, label)));
const field = (label: string, control: HTMLElement, hint?: HTMLElement | string) =>
  h('label', { class: 'field' }, h('span', { class: 'field-name' }, label), control, hint ? h('small', {}, hint) : null);
const actions = (cancel: () => void, submit: string) =>
  h('div', { class: 'dialog-actions' }, h('button', { type: 'button', class: 'ghost', onclick: cancel }, 'Cancel'), h('button', { type: 'submit', class: 'primary' }, submit));

export function newRecipeDialog(info: CatalogInfo, stackId: string | undefined, open: (item: EditableItem) => void): void {
  const stacks = stacksOf(info);
  const stack = select(stacks.map((s) => [s.id, `${s.name} (${s.id})`]), stackId);
  const category = select(info.categories.map((c) => [c.id, c.id]));
  const id = h('input', { type: 'text', placeholder: 'rate-limit', required: true, spellcheck: false, pattern: '[a-z0-9]+(-[a-z0-9]+)*', autocomplete: 'off' });
  const meaning = h('small', {});
  const folder = h('code', { class: 'preview' });
  const error = h('p', { class: 'error-text' });
  const update = () => {
    const s = stacks.find((x) => x.id === stack.value);
    meaning.textContent = info.categories.find((c) => c.id === category.value)?.meaning ?? '';
    folder.textContent = `stacks/${s?.language ?? '?'}/${stack.value}/recipes/${category.value}/${id.value.trim() || '<id>'}/`;
  };
  [stack, category, id].forEach((el) => el.addEventListener('input', update));
  update();
  const dialog = modal('New recipe', h('form', { class: 'stack-form', onsubmit: async (e) => {
    e.preventDefault();
    try {
      const item = await api.newRecipe({ stack: stack.value, category: category.value, id: id.value.trim() });
      dialog.close();
      open(item);
    } catch (err) { error.textContent = (err as Error).message; }
  } },
  field('Stack', stack),
  field('Category', category, meaning),
  field('Id', id, 'Lowercase words joined by dashes. It names the folder and cannot clash with another item.'),
  h('div', { class: 'preview-box' }, h('span', { class: 'muted' }, 'Folder'), folder),
  h('p', { class: 'muted' }, 'The draft starts at version 1.0.0 with a changelog entry. Nothing is written until you save.'),
  error, actions(() => dialog.close(), 'Create draft')));
}

export function harvestDialog(info: CatalogInfo, stackId: string | undefined, onDone: () => void): void {
  const project = h('input', { type: 'text', placeholder: '/absolute/path/to/your/project', required: true, spellcheck: false });
  const capability = h('input', { type: 'text', placeholder: 'AdMob ads with consent', required: true });
  const stack = select(stacksOf(info).map((s) => [s.id, s.name]), stackId);
  const category = select([['', 'Let the agent choose'], ...info.categories.map((c): [string, string] => [c.id, c.id])]);
  const agent = select([['claude', 'Claude Code'], ['codex', 'OpenAI Codex'], ['copilot', 'GitHub Copilot']]);
  const agentBin = h('input', { type: 'text', placeholder: '/absolute/path/to/agent', spellcheck: false });
  const agentModel = h('input', { type: 'text', placeholder: 'haiku', spellcheck: false });
  const submit = h('button', { type: 'submit', class: 'primary' }, 'Start harvest');
  const out = h('div', {});
  const dialog = modal('Harvest a recipe from your project', h('form', { class: 'stack-form', onsubmit: async (e) => {
    e.preventDefault();
    submit.disabled = true;
    try {
      const job = await api.startJob({ command: 'harvest', project: project.value.trim(), capability: capability.value.trim(), stack: stack.value, category: category.value, agent: agent.value, agentBin: agentBin.value.trim(), agentModel: agentModel.value.trim() });
      out.replaceChildren(jobView(job, () => { submit.disabled = false; onDone(); }));
    } catch (err) {
      submit.disabled = false;
      out.replaceChildren(h('p', { class: 'error-text' }, (err as Error).message));
    }
  } },
  h('p', { class: 'muted' }, 'Your coding agent reads the project and writes the recipe. It is filed under stacks/ only when the lint and the secret check pass. Your project is not changed.'),
  field('Project folder', project),
  field('Capability', capability, 'The one thing to extract, in a few words.'),
  h('div', { class: 'form-grid' }, field('Stack', stack), field('Category', category), field('Agent', agent)),
  h('details', { class: 'advanced' }, h('summary', {}, 'Advanced options'),
    h('div', { class: 'form-grid' }, field('Agent executable', agentBin, 'Only when the agent is not on your PATH.'), field('Model', agentModel, 'Leave empty for the agent\'s default.'))),
  h('div', { class: 'dialog-actions' }, h('button', { type: 'button', class: 'ghost', onclick: () => dialog.close() }, 'Close'), submit)), out);
}
