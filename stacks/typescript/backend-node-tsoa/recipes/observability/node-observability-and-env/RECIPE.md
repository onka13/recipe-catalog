---
schemaVersion: 1
id: node-observability-and-env
name: Node.js Structured Logger & Validated AppConfig
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: observability
standardType: logging
interfacePort: ILogger
order: 20
tags:
  - logging
  - observability
  - app-config
  - environment
  - fail-fast
  - clean-architecture
dependsOn:
  - node-core-foundation
parameters:
  - key: DEFAULT_PORT
    label: Default Server Port
    description: Port on which the server listens
    default: "3000"
    secret: false
verify:
  - npm run lint
---
# Node.js Structured Logger & Validated AppConfig

JSON structured logger with contextual tags, correlation ID tracking, and normalized, single-source-of-truth appConfig. Enforces zero process.env usage outside of appConfig.

## Instructions

### package.json
Configure canonical environment serve scripts: "serve-dev": "NODE_ENV=dev npm run serve", "serve-staging": "NODE_ENV=staging npm run serve", "serve-prod": "NODE_ENV=prod npm run serve".

### src/**/*.ts
CRITICAL ARCHITECTURAL MANDATE: Never use 'process.env' directly in controllers, services, or repositories. Import 'appConfig' from 'src/core/config/appConfig'. Do not add arbitrary speculative sample variables to appConfig; only define required, verified configuration keys.

## Changelog

### 1.0.0
- First version.
