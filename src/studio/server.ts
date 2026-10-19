import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { option } from '../cliShared.js';
import { inlinedSchema } from '../schemas.js';
import { readCatalog } from '../read.js';
import { catalogChanges } from './gitDiff.js';
import { findItem, lintEdited, listItems, newRecipe, saveEdited, StudioError, toEditable, type EditableItem } from './items.js';
import { JobRunner } from './jobs.js';

/**
 * Catalog Studio (CAT-28): a local page for creating and editing items. It listens on 127.0.0.1 only, answers only
 * requests addressed to that host (no DNS rebinding) from its own page, and sends nothing anywhere.
 */

const PAGE_DIR = fileURLToPath(new URL('../../../studio/', import.meta.url));
const SCRIPT_DIR = fileURLToPath(new URL('../../studio/web/', import.meta.url));
const MAX_BODY = 16 * 1024 * 1024;
const DEFAULT_PORT = 4310;
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'";
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

type Handler = (url: URL, body: Record<string, unknown>) => unknown;

function routes(root: string, jobs: JobRunner): Record<string, Handler> {
  const catalog = () => readCatalog(root).catalog;
  return {
    'GET /api/catalog': () => {
      const c = catalog();
      return { root, categories: c.categories, items: listItems(c) };
    },
    'GET /api/item': (url) => toEditable(findItem(catalog(), url.searchParams.get('path') ?? '')),
    'GET /api/schema': (url) => {
      const kind = url.searchParams.get('kind');
      if (kind !== 'stack' && kind !== 'scaffold' && kind !== 'recipe') throw new StudioError('kind is stack, scaffold or recipe.');
      return inlinedSchema(kind);
    },
    'GET /api/changes': () => catalogChanges(root),
    'GET /api/job': (url) => jobs.get(url.searchParams.get('id') ?? ''),
    'POST /api/lint': (_url, body) => {
      const { item, problems } = lintEdited(root, body.item as EditableItem);
      return { path: item.path, problems };
    },
    'POST /api/save': (_url, body) => {
      const { item, problems } = saveEdited(root, body.item as EditableItem);
      const saved = !problems.some((p) => p.severity === 'error');
      return { saved, path: item.path, problems, ...(saved ? { item: toEditable(findItem(catalog(), item.path)) } : {}) };
    },
    'POST /api/new': (_url, body) => newRecipe(catalog(), body),
    'POST /api/job': (_url, body) => jobs.start(body),
  };
}

/** Only this server's own page may call it: the Host is ours, and a cross-site request carries a foreign Origin. */
function sameOrigin(req: http.IncomingMessage, port: number): boolean {
  const own = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!own.includes(req.headers.host ?? '')) return false;
  const origin = req.headers.origin;
  return !origin || own.some((h) => origin === `http://${h}`);
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new StudioError('The request is too large.', 413)); req.destroy(); } else chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown> : {}); } catch { reject(new StudioError('The body is not JSON.')); }
    });
    req.on('error', reject);
  });
}

function send(res: http.ServerResponse, status: number, body: string | Buffer, type: string): void {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(body);
}

/** The page, its stylesheet and its compiled scripts; nothing else is served from disk. */
function staticFile(pathname: string): string | undefined {
  if (pathname === '/' || pathname === '/index.html') return path.join(PAGE_DIR, 'index.html');
  if (pathname === '/style.css') return path.join(PAGE_DIR, 'style.css');
  const script = /^\/web\/([a-zA-Z]+\.js)$/.exec(pathname)?.[1];
  return script ? path.join(SCRIPT_DIR, script) : undefined;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse, port: number, table: Record<string, Handler>): Promise<void> {
  if (!sameOrigin(req, port)) return send(res, 403, 'Forbidden', 'text/plain');
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const handler = table[`${req.method} ${url.pathname}`];
  if (!handler) {
    const file = req.method === 'GET' ? staticFile(url.pathname) : undefined;
    if (!file || !fs.existsSync(file)) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)]);
  }
  try {
    if (req.method === 'POST' && !(req.headers['content-type'] ?? '').startsWith('application/json')) throw new StudioError('Send JSON.', 415);
    const body = req.method === 'POST' ? await readBody(req) : {};
    send(res, 200, JSON.stringify(handler(url, body)), 'application/json');
  } catch (error) {
    const status = error instanceof StudioError ? error.status : 500;
    send(res, status, JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 'application/json');
  }
}

/** Starts the Studio on 127.0.0.1; `port` 0 picks a free port. */
export function startStudio(root: string, port: number): Promise<{ server: http.Server; port: number }> {
  const jobs = new JobRunner(root);
  const table = routes(root, jobs);
  let actualPort = port;
  const server = http.createServer((req, res) => void handle(req, res, actualPort, table));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      actualPort = (server.address() as { port: number }).port;
      resolve({ server, port: actualPort });
    });
  });
}

export async function studioCommand(args: string[], root: string): Promise<number> {
  const { server, port } = await startStudio(root, Number(option(args, 'port') ?? DEFAULT_PORT));
  console.log(`Catalog Studio: http://127.0.0.1:${port}/  (catalog ${root}; Ctrl+C stops it)`);
  await new Promise((resolve) => server.on('close', resolve));
  return 0;
}
