/** A small element builder: `h('button', { class: 'primary', onclick: save }, 'Save')`. */

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | undefined | ((event: Event) => void)>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'value' || key === 'checked') (el as unknown as Record<string, unknown>)[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
  return el;
}

export function clear(el: Element, ...children: Child[]): void {
  el.replaceChildren(...children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false));
}

/** Calls `fn` once `ms` after the last call. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

/** A short message in the bottom-right corner; errors stay until closed, the rest fade after a few seconds. */
export function toast(message: string, kind: 'ok' | 'error' = 'ok'): void {
  const el = h('div', { class: `toast ${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    h('span', {}, message), h('button', { type: 'button', class: 'ghost icon', 'aria-label': 'Dismiss', onclick: () => el.remove() }, '×'));
  document.getElementById('toasts')!.append(el);
  if (kind === 'ok') window.setTimeout(() => el.remove(), 4000);
}
