---
schemaVersion: 1
id: node-state-version-piggyback
name: Node.js Mobile State Versioning & Response Piggybacking Extension
version: 1.0.1
language: typescript
stack: backend-node-tsoa
category: api
standardType: custom
interfacePort: IStateVersionSynchronizer
order: 75
tags:
  - state-versioning
  - piggybacking
  - mobile-sync
  - bandwidth-optimization
  - clean-architecture
dependsOn:
  - node-base-controller
  - node-async-request-context
verify:
  - npm run lint
---
# Node.js Mobile State Versioning & Response Piggybacking Extension

Bandwidth and round-trip optimization engine for mobile/SPA APIs. Inspects client state version headers (x-user-data-version, x-user-state-data-version), tracks in-flight domain mutations via RequestContext, and piggybacks stale user/state payloads into response.meta to eliminate extra network polling.

## Conventions

### src/features/*/application/services/*Service.ts
Whenever a domain service mutates a user profile, streak, or currency state, call StateVersionSyncHelper.userChanged(updatedUser) or StateVersionSyncHelper.userStateChanged(updatedUserState) to enable zero-roundtrip response piggybacking.

### src/features/*/presentation/controllers/*Controller.ts
In controllers, compute piggyback metadata with StateVersionSyncHelper.computePiggybackMetadata(this.request, this.getTenant()) and pass it as the second argument to this.successResponse(result, meta).

## Changelog

### 1.0.1
- Rules for code written later (file patterns) moved from Instructions to Conventions; they are no longer applied at install.

### 1.0.0
- First version.
