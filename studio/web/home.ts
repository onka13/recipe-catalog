import type { CatalogInfo } from './api.js';
import { groupsOf } from './catalog.js';
import { h } from './dom.js';

/** The page with no item open: what the catalog holds, per stack, and the three steps of a contribution. */

export interface HomeActions {
  browse: (stackId: string) => void;
  newRecipe: (stackId: string) => void;
  harvest: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function homePage(info: CatalogInfo, changedCount: number, act: HomeActions): HTMLElement {
  const groups = groupsOf(info);
  const recipes = groups.reduce((n, g) => n + g.recipeCount, 0);
  const scaffolds = groups.reduce((n, g) => n + g.scaffolds.length, 0);
  const steps: Array<[string, string]> = [
    ['Open or create an item', 'Pick a recipe on the left, start a new one, or harvest one from a project of your own.'],
    ['Edit and save', 'Every change is linted as you type, and Save stays off while there is an error. A released item needs a new version first: use "New version".'],
    ['Open a pull request', `Changes shows the diff of what you saved. Commit it with a sign-off and push.${changedCount ? ` You have ${plural(changedCount, 'changed item')}.` : ''}`],
  ];
  return h('div', { class: 'home' },
    h('div', { class: 'home-head' },
      h('div', {}, h('h1', {}, 'Catalog overview'),
        h('p', { class: 'muted' }, `${plural(groups.length, 'stack')} · ${plural(scaffolds, 'scaffold')} · ${plural(recipes, 'recipe')}`)),
      h('div', { class: 'head-actions' }, h('button', { type: 'button', onclick: act.harvest }, 'Harvest from a project'))),
    h('ol', { class: 'steps' }, ...steps.map(([title, text]) => h('li', {}, h('strong', {}, title), h('span', {}, text)))),
    h('h2', { class: 'section-title' }, 'Stacks'),
    h('div', { class: 'stack-cards' }, ...groups.map((g) => h('article', { class: 'card stack-card' },
      h('div', { class: 'stack-card-head' },
        h('h3', {}, h('a', { href: `#${encodeURIComponent(g.stack.path)}`, title: 'Open the stack settings' }, g.stack.name)),
        h('span', { class: 'chip' }, g.stack.language)),
      h('p', { class: 'muted' }, `${plural(g.scaffolds.length, 'scaffold')} · ${plural(g.recipeCount, 'recipe')}`),
      h('div', { class: 'chips' }, ...g.categories.map((c) => h('span', { class: 'chip soft', title: info.categories.find((x) => x.id === c.id)?.meaning ?? '' }, `${c.id} ${c.recipes.length}`))),
      h('div', { class: 'card-actions' },
        h('button', { type: 'button', onclick: () => act.browse(g.stack.id) }, 'Browse'),
        h('button', { type: 'button', class: 'ghost', onclick: () => act.newRecipe(g.stack.id) }, 'New recipe here'))))));
}
