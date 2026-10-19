import { api, type Job } from './api.js';
import { h } from './dom.js';

/** Follows a verify or harvest run: its status and its output, read once a second until it ends. */
export function jobView(job: Job, onEnd?: (job: Job) => void): HTMLElement {
  const status = h('span', { class: 'chip running' }, 'running');
  const output = h('pre', { class: 'output' }, job.output);
  const show = (j: Job) => {
    status.textContent = j.status === 'running' ? 'running' : `${j.status} (exit ${j.exitCode ?? '?'})`;
    status.className = `chip ${j.status}`;
    const atEnd = output.scrollTop + output.clientHeight >= output.scrollHeight - 4;
    output.textContent = j.output || '(no output yet)';
    if (atEnd) output.scrollTop = output.scrollHeight;
  };
  const poll = async () => {
    try {
      const next = await api.job(job.id);
      show(next);
      if (next.status === 'running') window.setTimeout(poll, 1000);
      else onEnd?.(next);
    } catch (error) {
      status.textContent = `lost: ${(error as Error).message}`;
      status.className = 'chip failed';
    }
  };
  show(job);
  window.setTimeout(poll, 500);
  return h('div', { class: 'job' }, h('div', { class: 'job-head' }, h('code', {}, job.title), status), output);
}
