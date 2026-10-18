import fs from 'node:fs';
import path from 'node:path';
import { joinFrontMatter, renderBody, renderChangelog, renderConventions, renderInstructions } from './markdown.js';
import type { Item, Section } from './model.js';
import { ITEM_FILE } from './model.js';
import { propertyOrder } from './schemas.js';

const isEmpty = (v: unknown) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** Front matter in the schema's property order; empty optional values are left out. */
export function orderedMeta(item: Item): Record<string, unknown> {
  const meta = item.meta as unknown as Record<string, unknown>;
  const order = propertyOrder(item.kind);
  const out: Record<string, unknown> = {};
  for (const key of [...order, ...Object.keys(meta).filter((k) => !order.includes(k))]) {
    if (!isEmpty(meta[key])) out[key] = meta[key];
  }
  return out;
}

function bodySections(item: Item): Section[] {
  if (item.kind === 'stack') return item.extraSections;
  const out: Section[] = [];
  if (item.kind === 'recipe' && item.instructions.length) out.push({ title: 'Instructions', text: renderInstructions(item.instructions) });
  if (item.kind === 'recipe' && item.conventions.length) out.push({ title: 'Conventions', text: renderConventions(item.conventions) });
  out.push(...item.extraSections, { title: 'Changelog', text: renderChangelog(item.changelog) });
  return out;
}

/** The item's Markdown file text. */
export function renderItem(item: Item): string {
  return joinFrontMatter(orderedMeta(item), renderBody(item.title || item.meta.name, item.description, bodySections(item)));
}

/** Writes the item's Markdown file and replaces its `files/` folder with the item's files. */
export function writeItem(root: string, item: Item): void {
  const dir = path.join(root, item.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, ITEM_FILE[item.kind]), renderItem(item));
  if (item.kind === 'stack') return;
  const filesDir = path.join(dir, 'files');
  fs.rmSync(filesDir, { recursive: true, force: true });
  for (const file of item.files) {
    const target = path.resolve(filesDir, file.path);
    if (!target.startsWith(filesDir + path.sep)) throw new Error(`${item.path}: file path ${file.path} leaves the files/ folder.`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content);
  }
}
