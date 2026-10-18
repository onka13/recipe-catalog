---
schemaVersion: 1
id: node-feature-flags
name: Node.js Feature Flags & Branch-by-Abstraction Engine
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: core
standardType: remote-config
interfacePort: IFeatureFlags
order: 30
tags:
  - feature-flags
  - strangler-pattern
  - branch-by-abstraction
  - zero-downtime
dependsOn:
  - node-core-foundation
verify:
  - npm run lint
---
# Node.js Feature Flags & Branch-by-Abstraction Engine

Thread-safe runtime feature toggle provider supporting zero-downtime Strangler migrations, dual-run shadow execution, and instant rollback safety without service restarts.

## Changelog

### 1.0.0
- First version.
