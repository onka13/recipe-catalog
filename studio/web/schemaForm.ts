import type { JsonSchema } from './api.js';
import { h } from './dom.js';

/**
 * Front matter fields built from the format's JSON Schema: text, number, yes/no, a list of texts (one per line), and
 * a table for a list of objects (parameters, packages). The lint is the validation; the form only edits.
 */

export interface FormContext {
  meta: Record<string, unknown>;
  onChange: () => void;
  /** Suggestions per field (for example the categories). */
  suggestions: Record<string, string[]>;
}

const isEmpty = (v: unknown) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

function setValue(target: Record<string, unknown>, key: string, value: unknown): void {
  if (isEmpty(value)) delete target[key];
  else target[key] = value;
}

function scalarInput(schema: JsonSchema, target: Record<string, unknown>, key: string, ctx: FormContext): HTMLElement {
  const value = target[key];
  if (schema.type === 'boolean') {
    return h('input', { type: 'checkbox', checked: value === true, onchange: (e) => { target[key] = (e.target as HTMLInputElement).checked; ctx.onChange(); } });
  }
  const list = ctx.suggestions[key] ? `suggest-${key}` : undefined;
  const input = h('input', {
    type: schema.type === 'integer' ? 'number' : 'text', value: value === undefined ? '' : String(value), list, spellcheck: false,
    oninput: (e) => {
      const raw = (e.target as HTMLInputElement).value;
      setValue(target, key, schema.type === 'integer' && raw !== '' ? Number(raw) : raw);
      ctx.onChange();
    },
  });
  if (!list) return input;
  return h('span', {}, input, h('datalist', { id: list }, ...ctx.suggestions[key].map((s) => h('option', { value: s }))));
}

function textList(target: Record<string, unknown>, key: string, ctx: FormContext): HTMLElement {
  const lines = (target[key] as string[] | undefined) ?? [];
  return h('textarea', {
    rows: Math.max(2, lines.length + 1), class: 'mono', spellcheck: false, placeholder: 'One per line',
    oninput: (e) => {
      setValue(target, key, (e.target as HTMLTextAreaElement).value.split('\n').map((l) => l.trim()).filter(Boolean));
      ctx.onChange();
    },
  }, lines.join('\n'));
}

function objectTable(schema: JsonSchema, target: Record<string, unknown>, key: string, ctx: FormContext): HTMLElement {
  const columns = Object.entries(schema.items?.properties ?? {});
  const rows = (target[key] as Array<Record<string, unknown>> | undefined) ?? [];
  const wrap = h('div', { class: 'table-wrap' });
  const redraw = () => {
    const update = () => { setValue(target, key, rows); ctx.onChange(); };
    const body = rows.map((row, index) => h('tr', {},
      ...columns.map(([col, colSchema]) => h('td', {}, scalarInput(colSchema, row, col, { ...ctx, onChange: update }))),
      h('td', {}, h('button', { type: 'button', class: 'ghost', title: 'Remove this row', onclick: () => { rows.splice(index, 1); update(); redraw(); } }, 'Remove'))));
    wrap.replaceChildren(
      h('table', {}, h('thead', {}, h('tr', {}, ...columns.map(([col]) => h('th', {}, col)), h('th', {}))), h('tbody', {}, ...body)),
      h('button', { type: 'button', class: 'ghost', onclick: () => { rows.push(defaults(schema.items)); update(); redraw(); } }, `Add ${key === 'packages' ? 'package' : 'row'}`),
    );
  };
  redraw();
  return wrap;
}

function defaults(schema: JsonSchema | undefined): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [col, s] of Object.entries(schema?.properties ?? {})) {
    if (s.type === 'boolean') row[col] = false;
    else if ((schema?.required ?? []).includes(col)) row[col] = '';
  }
  return row;
}

function field(key: string, schema: JsonSchema, required: boolean, ctx: FormContext): HTMLElement {
  let control: HTMLElement;
  if (schema.const !== undefined) control = h('input', { type: 'text', value: String(schema.const), readonly: true });
  else if (schema.type === 'array' && schema.items?.type === 'object') control = objectTable(schema, ctx.meta, key, ctx);
  else if (schema.type === 'array') control = textList(ctx.meta, key, ctx);
  else control = scalarInput(schema, ctx.meta, key, ctx);
  const wide = schema.type === 'array' ? ' wide' : '';
  return h('label', { class: `field${wide}` },
    h('span', { class: 'field-name' }, key, required ? h('span', { class: 'required', title: 'Required' }, ' *') : null),
    control,
    schema.description ? h('small', {}, schema.description) : null);
}

export function schemaForm(schema: JsonSchema, ctx: FormContext): HTMLElement {
  const required = schema.required ?? [];
  return h('div', { class: 'form-grid' },
    ...Object.entries(schema.properties ?? {}).map(([key, s]) => field(key, s, required.includes(key), ctx)));
}
