---
schemaVersion: 1
id: node-async-request-context
name: Node.js Async Request Context & Execution Storage
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: core
standardType: custom
interfacePort: IRequestContext
order: 25
tags:
  - request-context
  - async-local-storage
  - parameter-drilling
  - correlation-id
  - clean-architecture
dependsOn:
  - node-core-foundation
verify:
  - npm run lint
---
# Node.js Async Request Context & Execution Storage

Thread-safe, request-scoped execution context utilizing Node.js AsyncLocalStorage (async_hooks) to eliminate parameter drilling for tenantId, correlationId, test flags, and mutable request-scoped state.

## Instructions

### src/server.ts
Mount contextMiddleware (from src/core/middleware/ContextMiddleware) at the top of the Express middleware pipeline before routing and TSOA controllers.

## Changelog

### 1.0.0
- First version.
