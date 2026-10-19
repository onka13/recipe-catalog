/** The Studio server's API (src/studio/server.ts); every call stays on this machine. */

export type Kind = 'stack' | 'scaffold' | 'recipe';
export interface ItemFile { path: string; content: string }
export interface Section { title: string; text: string }
export interface Problem { path: string; message: string; severity: 'error' | 'warning' }
export interface Category { id: string; meaning: string }

export interface EditableItem {
  kind: Kind;
  path: string;
  isNew: boolean;
  meta: Record<string, unknown>;
  title: string;
  description: string;
  instructions: string;
  conventions: string;
  changelog: string;
  extraSections: Section[];
  files: ItemFile[];
}

export interface ItemSummary { kind: Kind; path: string; id: string; name: string; version?: string; stack: string; category?: string }
export interface CatalogInfo { root: string; categories: Category[]; items: ItemSummary[] }
export interface LintResult { path: string; problems: Problem[] }
export interface SaveResult extends LintResult { saved: boolean; item?: EditableItem }
export interface Job { id: string; title: string; status: 'running' | 'passed' | 'failed'; exitCode?: number; output: string }
export interface Changes { files: Array<{ status: string; path: string }>; diff: string }

export interface JsonSchema {
  type?: string;
  const?: unknown;
  description?: string;
  pattern?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
}

async function call<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `${method} ${url} failed with ${response.status}`);
  return data;
}

const q = encodeURIComponent;

export const api = {
  catalog: () => call<CatalogInfo>('GET', '/api/catalog'),
  item: (path: string) => call<EditableItem>('GET', `/api/item?path=${q(path)}`),
  schema: (kind: Kind) => call<JsonSchema>('GET', `/api/schema?kind=${kind}`),
  changes: () => call<Changes>('GET', '/api/changes'),
  lint: (item: EditableItem) => call<LintResult>('POST', '/api/lint', { item }),
  save: (item: EditableItem) => call<SaveResult>('POST', '/api/save', { item }),
  newRecipe: (input: { stack: string; category: string; id: string }) => call<EditableItem>('POST', '/api/new', input),
  startJob: (fields: Record<string, string>) => call<Job>('POST', '/api/job', fields),
  job: (id: string) => call<Job>('GET', `/api/job?id=${q(id)}`),
};
