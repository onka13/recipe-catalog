import type { CatalogInfo, ItemSummary } from './api.js';
import { groupsOf, type StackGroup } from './catalog.js';
import { clear, h } from './dom.js';

/**
 * The item list: one collapsible group per stack, named by the stack's name, holding its definition, its scaffolds
 * and its recipes per category. The open item's stack opens by itself; a search opens every stack it matches.
 */

export interface SidebarState { info: CatalogInfo; active: string; changed: Set<string> }

export class Sidebar {
  private readonly open = new Set<string>();
  private state?: SidebarState;

  constructor(private readonly el: HTMLElement, private readonly filter: HTMLInputElement, private readonly result: HTMLElement) {
    filter.addEventListener('input', () => this.render());
    filter.addEventListener('keydown', (e) => { if (e.key === 'Escape') { filter.value = ''; this.render(); } });
  }

  update(state: SidebarState): void {
    this.state = state;
    const activeStack = state.info.items.find((i) => i.path === state.active)?.stack;
    if (activeStack) this.open.add(activeStack);
    this.render();
  }

  /** Opens a stack's group and brings it into view (the overview's stack cards use it). */
  reveal(stackId: string): void {
    this.open.add(stackId);
    this.render();
    this.el.querySelector(`[data-stack="${stackId}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  private link(item: ItemSummary, label: string, extra?: string): HTMLElement {
    const { active, changed } = this.state!;
    return h('li', {}, h('a', { href: `#${encodeURIComponent(item.path)}`, class: item.path === active ? 'item active' : 'item', title: `${item.id}\n${item.path}`, 'aria-current': item.path === active ? 'page' : undefined },
      h('span', { class: 'item-name' }, label),
      changed.has(item.path) ? h('span', { class: 'dot', title: 'Changed since the last commit' }) : null,
      extra ? h('span', { class: 'version' }, extra) : null));
  }

  private group(g: StackGroup, searching: boolean, showStack: boolean): HTMLElement {
    const section = (label: string, ...children: HTMLElement[]) => h('div', { class: 'section' }, h('h4', {}, label), ...children);
    const details = h('details', { class: 'stack', 'data-stack': g.stack.id, open: searching || this.open.has(g.stack.id) },
      h('summary', {},
        h('span', { class: 'stack-name' }, g.stack.name),
        h('span', { class: 'stack-meta' }, `${g.stack.language} · ${g.recipeCount} recipe${g.recipeCount === 1 ? '' : 's'}`)),
      showStack ? h('ul', {}, this.link(g.stack, 'Stack settings', 'STACK.md')) : null,
      g.scaffolds.length ? section('Scaffolds', h('ul', {}, ...g.scaffolds.map((s) => this.link(s, s.name, s.version)))) : null,
      g.categories.length ? section('Recipes', ...g.categories.map((c) => h('div', { class: 'category' },
        h('h5', {}, c.id), h('ul', {}, ...c.recipes.map((r) => this.link(r, r.name, r.version)))))) : null);
    details.addEventListener('toggle', () => { if (!searching) details.open ? this.open.add(g.stack.id) : this.open.delete(g.stack.id); });
    return details;
  }

  private render(): void {
    if (!this.state) return;
    const text = this.filter.value.trim().toLowerCase();
    const match = (i: ItemSummary) => [i.name, i.id, i.category ?? '', i.path].some((v) => v.toLowerCase().includes(text));
    const groups = groupsOf(this.state.info, text ? match : undefined)
      .filter((g) => !text || g.scaffolds.length || g.categories.length || match(g.stack));
    const count = groups.reduce((n, g) => n + g.scaffolds.length + g.recipeCount, 0);
    this.result.textContent = text ? (count ? `${count} match${count === 1 ? '' : 'es'}` : 'Nothing matches. Esc clears the search.') : '';
    clear(this.el,
      h('a', { href: '#', class: this.state.active ? 'item overview' : 'item overview active' }, 'Overview'),
      ...groups.map((g) => this.group(g, !!text, !text || match(g.stack))));
  }
}
