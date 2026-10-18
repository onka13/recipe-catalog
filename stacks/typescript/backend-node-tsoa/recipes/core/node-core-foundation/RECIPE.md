---
schemaVersion: 1
id: node-core-foundation
name: Node.js Core Foundation (AppError & ServiceResult Monad)
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: core
standardType: error-handler
interfacePort: IAppError
order: 10
tags:
  - errors
  - service-result
  - clean-code
  - railway-programming
  - core
verify:
  - npm run lint
---
# Node.js Core Foundation (AppError & ServiceResult Monad)

Authoritative application error taxonomy hierarchy (AppError, ValidationError, NotFoundError, UnauthorizedError, ConflictError, DatabaseError) and Railway-Oriented ServiceResult<T> monad for predictable, robust domain outcomes.

## Changelog

### 1.0.0
- First version.
