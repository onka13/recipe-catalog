---
schemaVersion: 1
id: node-firebase-appcheck
name: Node.js Firebase App Check Anti-Abuse & Bot Guard Extension
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: security
standardType: custom
interfacePort: IAppCheckValidator
order: 45
tags:
  - app-check
  - anti-abuse
  - device-attestation
  - bot-defense
  - firebase
  - security
dependsOn:
  - node-tsoa-security-gateway
packages:
  - name: firebase-admin
    version: ^12.0.0
    dev: false
verify:
  - npm run lint
---
# Node.js Firebase App Check Anti-Abuse & Bot Guard Extension

Cryptographic device attestation and anti-abuse extension for expressAuthentication. Verifies x-firebase-appcheck tokens (Play Integrity / DeviceCheck) to guarantee requests originate from genuine client app binaries rather than bots or scrapers.

## Instructions

### src/core/auth/expressAuthentication.ts
Import AppCheckValidator and call 'await AppCheckValidator.validateAppCheck(request, appId)' right after Bearer token validation to enforce device integrity.

## Changelog

### 1.0.0
- First version.
