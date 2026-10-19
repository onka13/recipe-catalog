---
schemaVersion: 1
id: node-generic-repository
name: Node.js Generic Repository (BaseMongo & TenantMongo Architecture)
version: 1.0.2
language: typescript
stack: backend-node-tsoa
category: storage
standardType: database-repository
interfacePort: IGenericRepository
order: 50
tags:
  - repository-pattern
  - mongodb
  - multi-tenancy
  - clean-architecture
  - hexagonal
  - soft-delete
  - atomic-inc
dependsOn:
  - node-core-foundation
parameters:
  - key: DATABASE_NAME
    label: MongoDB Database Name
    description: Target database name for collection binding
    default: app-db
    secret: false
packages:
  - name: zod
    version: ^3.22.4
    dev: false
  - name: mongoose
    version: ^9.7.4
    dev: false
verify:
  - npm run lint
---
# Node.js Generic Repository (BaseMongo & TenantMongo Architecture)

Layered generic repository pattern isolating MongoDB persistence behind clean database-agnostic QueryModels, supporting optional soft-delete (for Reference vs Business entities), atomic increments, partial updates, and multi-tenancy via TenantMongoRepository inheritance.

## Conventions

### src/features/*/infrastructure/repositories/*Repository.ts
Extend BaseMongoRepository for global/reference collections (e.g. Country, Currency, SystemConfig with softDelete: false) or TenantMongoRepository for tenant-scoped business entities. Implement domain-specific methods by composing findBy, findByPartial, or incrementBy without leaking Mongoose Document types into domain use cases.

## Changelog

### 1.0.2
- Declares `mongoose`, which the repository imports; without it the project did not compile.
- The collection is typed as the MongoDB driver's collection with string `_id`s, which it is; the mongoose `Collection` type did not compile.

### 1.0.1
- Rules for code written later (file patterns) moved from Instructions to Conventions; they are no longer applied at install.

### 1.0.0
- First version.
