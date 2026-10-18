---
schemaVersion: 1
id: node-hmac-signature-guard
name: Node.js HMAC Request Body Tamper Guard Extension
version: 1.0.0
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
parameters:
  - key: HMAC_SECRET_KEY
    label: HMAC Secret Signing Key
    description: Shared secret key used to compute and verify HMAC-SHA256 request signatures
    secret: true
verify:
  - npm run lint
---
# Node.js HMAC Request Body Tamper Guard Extension

Cryptographic HMAC-SHA256 signature verification extension for API requests. Guarantees message integrity, replay protection with timestamp freshness windows, and payload tamper defense.

## Instructions

### src/core/auth/expressAuthentication.ts
Import HmacSignatureVerifier and invoke 'HmacSignatureVerifier.verify(request)' inside expressAuthentication hook to protect endpoints against tampering and replay attacks.

## Changelog

### 1.0.0
- First version.
