---
schemaVersion: 1
id: node-characterization-test-harness
name: Node.js Characterization & Golden Master Test Harness
version: 1.0.2
language: typescript
stack: backend-node-tsoa
category: testing
standardType: custom
interfacePort: ICharacterizationHarness
order: 95
tags:
  - characterization-testing
  - golden-master
  - regression-safety
  - pii-masking
  - dry-run
  - supertest
dependsOn:
  - node-core-foundation
packages:
  - name: supertest
    version: ^6.3.3
    dev: true
  - name: "@types/supertest"
    version: ^6.0.2
    dev: true
verify:
  - npm run lint
---
# Node.js Characterization & Golden Master Test Harness

Michael Feathers Golden Master / Characterization Test Harness with PII Redaction and Dry-Run side-effect guards. Enables QA and Coder agents to record deterministic, compliant snapshots of legacy endpoints to verify 100% mathematical parity during Strangler Fig refactoring.

## Conventions

### src/**/*.characterization.test.ts
Before refactoring any legacy route, create a characterization test recording its baseline behavior, next to the route and named `<route>.characterization.test.ts` so `npm run test` (and the job's test check) runs it. Always use CharacterizationHarness with PiiMasker enabled. When testing mutation routes, set dryRun: true and override external gateway adapters in the IoC container with mocks.

## Changelog

### 1.0.2
- Characterization tests now live under `src/` as `*.characterization.test.ts`. The scaffold's `npm run test` only runs `src/**/*.test.ts`, so tests written to the old `tests/characterization/*.spec.ts` pattern were never run by the test check.

### 1.0.1
- Rules for code written later (file patterns) moved from Instructions to Conventions; they are no longer applied at install.

### 1.0.0
- First version.
