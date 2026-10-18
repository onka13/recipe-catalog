---
schemaVersion: 1
id: node-anti-corruption-layer
name: Node.js Anti-Corruption Layer (ACL) & Schema Bridge
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: architecture
standardType: custom
interfacePort: IAntiCorruptionLayerMapper
order: 48
tags:
  - anti-corruption-layer
  - acl
  - ddd
  - clean-architecture
  - data-mapper
  - schema-bridge
dependsOn:
  - node-core-foundation
  - node-boundary-validation
verify:
  - npm run lint
---
# Node.js Anti-Corruption Layer (ACL) & Schema Bridge

Eric Evans Domain-Driven Design Anti-Corruption Layer (ACL). Insulates modern V2 domain entities and use cases from dirty, legacy Mongoose schemas and historical field naming inconsistencies via bidirectional, validated data mappers.

## Instructions

### src/features/*/infrastructure/acl/*AclMapper.ts
Extend BaseAclMapper to insulate new domain entities from legacy database schema inconsistencies. Never pass raw legacy documents directly to domain use cases or presentation controllers.

## Changelog

### 1.0.0
- First version.
