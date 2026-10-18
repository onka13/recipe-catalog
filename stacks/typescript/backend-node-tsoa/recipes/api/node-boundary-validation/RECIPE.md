---
schemaVersion: 1
id: node-boundary-validation
name: Node.js Express / TSOA Zod Boundary Defense Middleware
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: api
standardType: error-handler
interfacePort: IZodValidator
order: 40
tags:
  - zod
  - validation
  - middleware
  - express
  - boundary-defense
dependsOn:
  - node-core-foundation
packages:
  - name: zod
    version: ^3.22.4
    dev: false
verify:
  - npm run lint
---
# Node.js Express / TSOA Zod Boundary Defense Middleware

Express HTTP boundary defense middleware that validates request body, query parameters, and route params using Zod schemas, mapping validation failures directly into standardized ValidationError payloads.

## Changelog

### 1.0.0
- First version.
