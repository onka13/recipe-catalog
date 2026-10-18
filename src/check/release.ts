import { buildBundle, type Bundle } from '../bundle.js';
import type { Catalog } from '../model.js';
import { describeErrors, validator } from '../schemas.js';
import { CatalogChecker, type CheckOptions, type ItemCheck } from './check.js';

export interface ChecksReport {
  schemaVersion: 1;
  catalogVersion: string;
  items: ItemCheck[];
}

export interface ReleaseResult {
  bundle: Bundle;
  checks: ChecksReport;
  failed: ItemCheck[];
  reused: number;
}

export function assertValidChecks(report: unknown): asserts report is ChecksReport {
  const validate = validator('checks');
  if (!validate(report)) throw new Error(`The check report does not match checks.schema.json: ${describeErrors(validate.errors).join('; ')}`);
}

/**
 * Checks every scaffold and recipe whose content is new or changed since the previous release, reusing the previous
 * report's passed result for unchanged content (same id and content hash), and returns the bundle and report to write.
 */
export function prepareRelease(catalog: Catalog, version: string, previous: ChecksReport | undefined, options: CheckOptions, log: (line: string) => void): ReleaseResult {
  const bundle = buildBundle(catalog, version);
  const passedBefore = new Map((previous?.items ?? []).filter((i) => i.status === 'passed').map((i) => [`${i.kind}:${i.id}:${i.contentHash}`, i]));
  const checker = new CatalogChecker(catalog, options);
  const items: ItemCheck[] = [];
  let reused = 0;
  const run = (kind: 'scaffold' | 'recipe', id: string, hash: string, check: () => ItemCheck) => {
    const before = passedBefore.get(`${kind}:${id}:${hash}`);
    if (before) { items.push(before); reused++; return; }
    log(`checking ${kind} ${id} ...`);
    const result = check();
    log(`  ${result.status}`);
    items.push(result);
  };
  for (const s of catalog.scaffolds) run('scaffold', s.meta.id, String(bundle.scaffolds.find((b) => b.path === s.path)?.contentHash), () => checker.scaffold(s));
  for (const r of catalog.recipes) run('recipe', r.meta.id, String(bundle.recipes.find((b) => b.path === r.path)?.contentHash), () => checker.recipe(r));
  const checks: ChecksReport = { schemaVersion: 1, catalogVersion: version, items };
  assertValidChecks(checks);
  return { bundle, checks, failed: items.filter((i) => i.status === 'failed'), reused };
}
