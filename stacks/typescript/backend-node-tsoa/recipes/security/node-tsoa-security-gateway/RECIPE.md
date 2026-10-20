---
schemaVersion: 1
id: node-tsoa-security-gateway
name: Node.js TSOA Firebase Security Gateway & Multi-Tenant Auth
version: 1.1.0
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
packages:
  - name: firebase-admin
    version: ^12.0.0
    dev: false
verify:
  - npm run lint
---
# Node.js TSOA Firebase Security Gateway & Multi-Tenant Auth

Production TSOA expressAuthentication security gateway. Handles multi-app resolution (x-app-id), Firebase Bearer token verification, Admin RBAC roles from the token's `roles` custom claim, and pre-populates request.user with fully hydrated TenantInfo so controllers remain 100% auth-agnostic.

Firebase Admin uses the application default credentials (`GOOGLE_APPLICATION_CREDENTIALS`, or the platform's service account).

## Instructions

### tsoa.json
Add `"authenticationModule": "./src/core/auth/expressAuthentication.ts"` to the `routes` object, so the generated routes call `expressAuthentication` for every `@Security` decorator.

### src/server.ts
In `createServer`, before `RegisterRoutes(app)`, call `setTenantInfoProvider(new TokenTenantInfoProvider())`, importing both from `./core/auth`. A project whose tenants are stored records passes its own `ITenantInfoProvider` instead.

## Changelog

### 1.1.0
- Admin endpoints (`admin_rbac`) verify the Firebase token and require its `roles` claim to hold the scopes; any bearer token was accepted as an admin before.
- A tenant is always resolved by the provider set at startup; `TokenTenantInfoProvider` is the shipped one. Without a provider the request fails instead of building a tenant from the token silently.
- Instructions name the scaffold's files (`tsoa.json`, `createServer` in `src/server.ts`).
- Removed the unused `FIREBASE_PROJECT_ID` parameter.

### 1.0.0
- First version.
