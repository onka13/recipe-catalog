import fs from 'node:fs';
import path from 'node:path';
import { renderItem } from '../write.js';
import type { Problem, RecipeItem } from '../model.js';

/** CAT-23: a harvested item holds no secret value, no id of the developer's own accounts and not their package name. */

const KEY_PATTERNS: Array<[string, RegExp]> = [
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['an AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['a Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['an API secret key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['a Stripe live key', /\b[sr]k_live_[0-9A-Za-z]{16,}/],
  ['a GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/],
  ['a Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['a signed token (JWT)', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
];

/** AdMob ids, except Google's public test publisher. */
const ADMOB_ID = /ca-app-pub-(\d{16})/g;
const ADMOB_TEST_PUBLISHER = '3940256099942544';
const MIN_SECRET_LENGTH = 8;
const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

/** Values of the project's `.env` files (top folder and one level down), as `KEY -> value`. */
export function envValues(projectDir: string): Map<string, string> {
  const values = new Map<string, string>();
  const dirs = [projectDir, ...fs.readdirSync(projectDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules').map((e) => path.join(projectDir, e.name))];
  for (const dir of dirs) {
    for (const name of fs.readdirSync(dir).filter((n) => n === '.env' || n.startsWith('.env.'))) {
      for (const line of fs.readFileSync(path.join(dir, name), 'utf8').split('\n')) {
        const m = ENV_LINE.exec(line);
        const value = m?.[2].trim().replace(/^(['"])(.*)\1$/, '$2');
        if (m && value && value.length >= MIN_SECRET_LENGTH) values.set(m[1], value);
      }
    }
  }
  return values;
}

function itemTexts(item: RecipeItem): Array<[string, string]> {
  return [['RECIPE.md', renderItem(item)], ...item.files.map((f): [string, string] => [`files/${f.path}`, f.content])];
}

export function findLeaks(item: RecipeItem, projectDir: string, packageName?: string): Problem[] {
  const problems: Problem[] = [];
  const report = (where: string, message: string) => void problems.push({ path: `${item.path}/${where}`, message, severity: 'error' });
  const env = envValues(projectDir);
  for (const [where, text] of itemTexts(item)) {
    for (const [key, value] of env) if (text.includes(value)) report(where, `holds the value of ${key} from the project's .env; use a secret parameter.`);
    for (const [what, pattern] of KEY_PATTERNS) if (pattern.test(text)) report(where, `holds ${what}; use a secret parameter.`);
    for (const m of text.matchAll(ADMOB_ID)) if (m[1] !== ADMOB_TEST_PUBLISHER) report(where, `holds the AdMob id ${m[0]}; use a parameter (Google's test ids may be defaults).`);
    if (packageName && (text.includes(`package:${packageName}/`) || text.includes(`"${packageName}"`))) {
      report(where, `holds the project's package name "${packageName}"; use {{PACKAGE_NAME}}.`);
    }
  }
  return problems;
}
