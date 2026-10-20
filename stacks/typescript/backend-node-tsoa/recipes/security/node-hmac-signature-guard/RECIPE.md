---
schemaVersion: 1
id: node-hmac-signature-guard
name: Node.js HMAC Request Body Tamper Guard Extension
version: 1.1.0
language: typescript
stack: backend-node-tsoa
category: security
standardType: custom
interfacePort: IHmacSignatureGuard
order: 46
tags:
  - hmac
  - signature-verification
  - tamper-protection
  - integrity
  - security
dependsOn:
  - node-tsoa-security-gateway
verify:
  - npm run lint
---
# Node.js HMAC Request Body Tamper Guard Extension

Cryptographic HMAC-SHA256 signature verification extension for API requests. Guarantees message integrity, replay protection with timestamp freshness windows, and payload tamper defense.

The shared signing secret is read from the `HMAC_SECRET_KEY` environment variable (or passed as `secretKey`); a request fails when neither is set.

## Instructions

### src/core/auth/expressAuthentication.ts
Import HmacSignatureVerifier from './extensions/HmacSignatureVerifier' and invoke 'HmacSignatureVerifier.verify(request)' inside the expressAuthentication hook, before the scheme is resolved, to protect endpoints against tampering and replay attacks.

## Changelog

### 1.1.0
- The signing secret comes only from `HMAC_SECRET_KEY` (or `secretKey`) at run time; the `HMAC_SECRET_KEY` parameter, which wrote the secret into the source file, is removed.
- Removed the `HMAC_VERIFICATION_DISABLED` switch that skipped verification.
- No `extensions/index.ts`: it replaced the App Check recipe's file of the same name; import the verifier from its own file.

### 1.0.0
- First version.
