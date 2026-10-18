---
schemaVersion: 1
id: node-strangler-router-facade
name: Node.js Strangler Fig & Branch-by-Abstraction Router Facade
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: architecture
standardType: custom
interfacePort: IStranglerRouterFacade
order: 35
tags:
  - strangler-fig
  - branch-by-abstraction
  - refactoring
  - feature-flags
  - shadow-execution
  - zero-downtime
dependsOn:
  - node-core-foundation
  - node-feature-flags
  - node-observability-and-env
verify:
  - npm run lint
---
# Node.js Strangler Fig & Branch-by-Abstraction Router Facade

Production Strangler Fig and Branch-by-Abstraction router facade. Dynamically routes incoming HTTP requests between legacy monolithic route handlers and modern modular V2 routers via FeatureFlags, supporting optional shadow-mode execution for zero-downtime migrations.

## Instructions

### server/api.ts
Wrap legacy route endpoints in createStranglerRoute({ flagKey: 'USE_V2_<MODULE>', legacyHandler, modernHandler: v2Router }) to progressively strangle the monolithic router with zero downtime.

## Changelog

### 1.0.0
- First version.
