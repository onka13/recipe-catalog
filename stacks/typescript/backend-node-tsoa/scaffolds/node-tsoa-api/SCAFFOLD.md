---
schemaVersion: 1
id: node-tsoa-api
name: Node TypeScript API
version: 1.0.0
language: typescript
stack: backend-node-tsoa
markerFile: package.json
requiredTools:
  - node
  - npm
  - git
commands:
  - npm init -y > /dev/null
  - npm pkg set name={{PACKAGE_NAME}} private=true main=dist/index.js scripts.build="tsc -p tsconfig.json" scripts.lint="tsc -p tsconfig.json --noEmit" scripts.test="node --test"
  - npm install --include=dev --no-audit --no-fund express@4.21.2
  - npm install --include=dev --no-audit --no-fund --save-dev typescript@5.6.3 @types/node@20.17.10 @types/express@4.17.21
verify:
  - npm run lint
  - npm run build
mandatoryRecipes:
  - node-delivery-scripts
  - node-core-foundation
  - node-observability-and-env
  - node-feature-flags
  - node-boundary-validation
---
# Node TypeScript API

A TypeScript Express API: package.json with build, lint and test scripts, tsconfig.json and src/index.ts.

## Changelog

### 1.0.0
- First version.
