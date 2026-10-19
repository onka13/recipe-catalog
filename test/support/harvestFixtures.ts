import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * A small Flutter project with ads and consent, and a stand-in for a coding agent CLI: it is started the way
 * `claude -p` is, records its arguments, and writes the item the prompt asks for.
 */

export const REAL_ADMOB_APP = 'ca-app-pub-1234567890123456~1234567890';
export const ENV_SECRET = 'live-secret-9f8e7d6c5b4a';

export function flutterProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harvest-project-'));
  const write = (rel: string, text: string) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
  write('pubspec.yaml', 'name: acme_shop\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  flutter:\n    sdk: flutter\n  google_mobile_ads: ^5.1.0\n');
  write('.env', `ADMOB_APP_ID=${REAL_ADMOB_APP}\nPAYMENTS_SECRET=${ENV_SECRET}\n`);
  write('lib/main.dart', "import 'package:acme_shop/core/ads/ad_service.dart';\nimport 'package:acme_shop/screens/home.dart';\n\nvoid main() {\n  AdService().init();\n  runHome();\n}\n");
  write('lib/core/ads/ad_service.dart', "import 'package:acme_shop/core/ads/consent_manager.dart';\n\nclass AdService {\n  final ConsentManager consent = ConsentManager();\n  void init() {\n    consent.request();\n  }\n  String get bannerUnit => 'ca-app-pub-1234567890123456/1111111111';\n}\n");
  write('lib/core/ads/consent_manager.dart', 'class ConsentManager {\n  bool granted = false;\n  void request() {\n    granted = true;\n  }\n}\n');
  write('lib/screens/home.dart', "import 'package:acme_shop/core/ads/ad_service.dart';\n\nvoid runHome() {\n  AdService().bannerUnit;\n}\n");
  write('lib/screens/cart.dart', 'class Cart {\n  final List<String> items = [];\n}\n');
  return dir;
}

const RECIPE = (body: { leak: boolean }) => `---
schemaVersion: 1
id: ads-consent
name: Ads Consent
version: 1.0.0
language: dart
stack: mobile-flutter
category: monetization
standardType: ads-consent
order: 50
parameters:
  - key: ADMOB_APP_ID
    label: AdMob app id
    default: ${body.leak ? REAL_ADMOB_APP : 'ca-app-pub-3940256099942544~3347511713'}
    secret: false
verify:
  - flutter analyze
---
# Ads Consent

Asks for ad consent before ads load.

## Instructions

### lib/main.dart
Call \`ConsentManager().request()\` before \`runApp\`.

## Changelog

### 1.0.0
- First version.
`;

const CONSENT = (leak: boolean) => `import 'package:${leak ? 'acme_shop' : '{{PACKAGE_NAME}}'}/core/ads/ad_service.dart';\n\nclass ConsentManager {\n  bool granted = false;\n  void request() {\n    granted = true;\n  }\n}\n`;

/**
 * Writes the fake agent. `mode` "fix" writes a leaking item first and a clean one when the prompt lists problems;
 * "clean" writes the clean item at once; "never" always leaks.
 */
export function fakeAgent(mode: 'fix' | 'clean' | 'never' | 'decline'): { bin: string; calls: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-agent-'));
  const bin = path.join(dir, 'agent.mjs');
  const calls = path.join(dir, 'calls.jsonl');
  fs.writeFileSync(bin, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1] ?? '';
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ args: args.filter((a) => a !== prompt), cwd: process.cwd(), prompt }) + '\\n');
if (${JSON.stringify(mode)} === 'decline') { console.log('The stack already has this capability: node-core-foundation.'); process.exit(0); }
const leak = ${JSON.stringify(mode)} === 'never' || (${JSON.stringify(mode)} === 'fix' && !prompt.includes('<problems>'));
fs.mkdirSync('item/files/lib/core/ads', { recursive: true });
fs.mkdirSync('item/files/test/core/ads', { recursive: true });
fs.writeFileSync('item/RECIPE.md', leak ? ${JSON.stringify(RECIPE({ leak: true }))} : ${JSON.stringify(RECIPE({ leak: false }))});
fs.writeFileSync('item/files/lib/core/ads/consent_manager.dart', leak ? ${JSON.stringify(CONSENT(true))} : ${JSON.stringify(CONSENT(false))});
fs.writeFileSync('item/files/test/core/ads/consent_manager_test.dart', 'void main() {}\\n');
console.log('ads-consent (monetization): RECIPE.md, files/lib/core/ads/consent_manager.dart');
`);
  fs.chmodSync(bin, 0o755);
  return { bin, calls };
}

export function agentCalls(calls: string): Array<{ args: string[]; cwd: string; prompt: string }> {
  return fs.readFileSync(calls, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { args: string[]; cwd: string; prompt: string });
}
