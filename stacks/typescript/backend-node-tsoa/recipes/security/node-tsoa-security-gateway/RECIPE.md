---
schemaVersion: 1
id: node-tsoa-security-gateway
name: Node.js TSOA Firebase Security Gateway & Multi-Tenant Auth
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: security
standardType: custom
interfacePort: ISecurityGateway
order: 40
tags:
  - auth
  - firebase-auth
  - tsoa
  - express-authentication
  - multi-tenant
  - security-gateway
dependsOn:
  - node-core-foundation
  - node-base-controller
parameters:
  - key: FIREBASE_PROJECT_ID
    label: Firebase Project ID
    description: Firebase Cloud Project ID for token verification
    default: sandbox-app
    secret: false
packages:
  - name: firebase-admin
    version: ^12.0.0
    dev: false
verify:
  - npm run lint
---
# Node.js TSOA Firebase Security Gateway & Multi-Tenant Auth

Production TSOA expressAuthentication security gateway. Handles multi-app resolution (x-app-id), Firebase Bearer token verification, Admin RBAC roles, and pre-populates request.user with fully hydrated TenantInfo so controllers remain 100% auth-agnostic.

## Instructions

### tsoa.json
Configure authenticationModule under routes in tsoa.json pointing to 'src/core/auth/expressAuthentication.ts'.

### src/server.ts
Inject your application's ITenantInfoProvider implementation using setTenantInfoProvider(new MongoTenantInfoProvider()) during server startup.

## Changelog

### 1.0.0
- First version.
