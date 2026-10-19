import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';

export const SCHEMA_DIR = fileURLToPath(new URL('../../schema/', import.meta.url));
const NAMES = ['defs', 'stack', 'scaffold', 'recipe', 'bundle', 'checks'] as const;
export type SchemaName = (typeof NAMES)[number];

type JsonSchema = { properties?: Record<string, unknown> } & Record<string, unknown>;

let ajv: Ajv2020 | null = null;
const raw = new Map<SchemaName, JsonSchema>();

function load(): Ajv2020 {
  if (ajv) return ajv;
  const instance = new Ajv2020({ allErrors: true, strict: true });
  for (const name of NAMES) {
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, `${name}.schema.json`), 'utf8')) as JsonSchema;
    raw.set(name, schema);
    instance.addSchema(schema);
  }
  ajv = instance;
  return instance;
}

export function validator(name: Exclude<SchemaName, 'defs'>): ValidateFunction {
  const fn = load().getSchema(`${name}.schema.json`);
  if (!fn) throw new Error(`Schema ${name}.schema.json is not loaded.`);
  return fn;
}

/** The property order the schema declares; the writer emits front matter in this order. */
export function propertyOrder(name: 'stack' | 'scaffold' | 'recipe'): string[] {
  load();
  return Object.keys(raw.get(name)?.properties ?? {});
}

export function describeErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => {
    const where = e.instancePath ? e.instancePath.slice(1).replace(/\//g, '.') : 'front matter';
    const extra = e.keyword === 'additionalProperties' ? ` (${String(e.params.additionalProperty)})` : '';
    return `${where}: ${e.message ?? e.keyword}${extra}`;
  });
}

const DEFS_REF = /^defs\.schema\.json#\/\$defs\/(.+)$/;

/** The schema with every `defs.schema.json` reference replaced by its definition (Catalog Studio builds its forms from it). */
export function inlinedSchema(name: 'stack' | 'scaffold' | 'recipe'): Record<string, unknown> {
  load();
  const defs = (raw.get('defs')?.$defs ?? {}) as Record<string, Record<string, unknown>>;
  const inline = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(inline);
    if (!value || typeof value !== 'object') return value;
    const { $ref, ...rest } = value as Record<string, unknown>;
    const def = typeof $ref === 'string' ? DEFS_REF.exec($ref)?.[1] : undefined;
    const merged = def ? { ...defs[def], ...rest } : rest;
    return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, inline(v)]));
  };
  return inline(raw.get(name)) as Record<string, unknown>;
}
