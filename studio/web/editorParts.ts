import { api, type EditableItem, type Problem } from './api.js';
import { h } from './dom.js';
import { jobView } from './jobView.js';

/** The pieces of an item's editor: Markdown sections, the lint result and the Verify panel. */

const AGENTS: Array<[string, string]> = [['', 'None: stop before the instructions'], ['claude', 'Claude Code'], ['codex', 'OpenAI Codex'], ['copilot', 'GitHub Copilot']];
const DEFAULT_IMAGE = 'recipe-catalog-toolchain';

export function markdownArea(label: string, hint: string, value: string, set: (v: string) => void, onChange: () => void, section?: string): HTMLElement {
  return h('section', { class: 'card' },
    h('h3', {}, label), h('p', { class: 'muted' }, hint),
    h('textarea', { class: 'mono grow', rows: Math.min(24, Math.max(6, value.split('\n').length + 1)), spellcheck: false, 'data-section': section, 'aria-label': label,
      oninput: (e) => { set((e.target as HTMLTextAreaElement).value); onChange(); } }, value));
}

/** "2 errors · 1 warning", or "No problems"; `pending` while a newer edit is still being checked. */
export function lintSummary(problems: Problem[] | undefined, pending: boolean): { text: string; cls: string } {
  if (!problems) return { text: 'Checking ...', cls: 'chip running' };
  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.length - errors;
  const parts = [errors ? `${errors} error${errors === 1 ? '' : 's'}` : '', warnings ? `${warnings} warning${warnings === 1 ? '' : 's'}` : ''].filter(Boolean);
  const text = `${parts.length ? parts.join(' · ') : 'No problems'}${pending ? ' (checking ...)' : ''}`;
  return { text, cls: errors ? 'chip failed' : warnings ? 'chip running' : 'chip passed' };
}

/** The problems of the item, with paths shortened to the part inside its folder. */
export function problemList(problems: Problem[] | undefined, itemPath: string): HTMLElement | null {
  if (!problems?.length) return null;
  const where = (p: string) => (itemPath && p.startsWith(`${itemPath}/`) ? p.slice(itemPath.length + 1) : p === itemPath ? '' : p);
  const errors = problems.some((p) => p.severity === 'error');
  return h('div', { class: errors ? 'problems' : 'problems warnings-only', role: 'region', 'aria-label': 'Lint problems' },
    h('ul', {}, ...problems.map((p) => h('li', { class: p.severity },
      h('span', { class: 'sev' }, p.severity === 'error' ? 'Error' : 'Warning'),
      where(p.path) ? h('code', { class: 'where' }, where(p.path)) : null,
      h('span', {}, p.message)))));
}

export function verifyPanel(item: EditableItem, isDirty: () => boolean): HTMLElement {
  if (item.isNew) return h('section', { class: 'card' }, h('h3', {}, 'Verify'), h('p', { class: 'muted' }, 'Save the item first; the check runs on the saved folder.'));
  const agent = h('select', {}, ...AGENTS.map(([value, label]) => h('option', { value }, label)));
  const agentBin = h('input', { type: 'text', placeholder: '/absolute/path/to/agent', spellcheck: false });
  const agentModel = h('input', { type: 'text', placeholder: 'haiku', spellcheck: false });
  const image = h('input', { type: 'text', value: DEFAULT_IMAGE, spellcheck: false });
  const out = h('div', {});
  const warn = h('p', { class: 'warn-text', hidden: true }, 'You have unsaved changes; the check runs on the saved version.');
  const button = h('button', { type: 'button', class: 'primary', onclick: async () => {
    warn.hidden = !isDirty();
    button.disabled = true;
    try {
      const job = await api.startJob({ command: 'verify', id: String(item.meta.id), image: image.value.trim(), agent: agent.value, agentBin: agentBin.value.trim(), agentModel: agentModel.value.trim() });
      out.replaceChildren(jobView(job, () => { button.disabled = false; }));
    } catch (error) {
      button.disabled = false;
      out.replaceChildren(h('p', { class: 'error-text' }, (error as Error).message));
    }
  } }, 'Run check');
  return h('section', { class: 'card' },
    h('h3', {}, 'Verify'),
    h('p', { class: 'muted' }, 'Applies the saved item to a fresh project of its stack in the toolchain image, lets the agent carry out its instructions, then builds and tests (FORMAT.md 7.3).'),
    h('div', { class: 'form-grid' },
      h('label', { class: 'field' }, h('span', { class: 'field-name' }, 'Agent'), agent),
      h('label', { class: 'field' }, h('span', { class: 'field-name' }, 'Docker image'), image)),
    h('details', { class: 'advanced' }, h('summary', {}, 'Advanced options'),
      h('div', { class: 'form-grid' },
        h('label', { class: 'field' }, h('span', { class: 'field-name' }, 'Agent executable'), agentBin, h('small', {}, 'Only when the agent is not on your PATH.')),
        h('label', { class: 'field' }, h('span', { class: 'field-name' }, 'Model'), agentModel, h('small', {}, 'Leave empty for the agent\'s default.')))),
    h('div', { class: 'card-actions' }, button), warn, out);
}
