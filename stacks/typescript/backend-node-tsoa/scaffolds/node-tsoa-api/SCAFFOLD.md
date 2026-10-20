---
schemaVersion: 1
id: node-tsoa-api
name: Node TypeScript API
version: 2.0.0
language: typescript
stack: backend-node-tsoa
markerFile: package.json
requiredTools:
  - node
  - npm
  - git
commands:
  - npm init -y > /dev/null
  - npm pkg set name={{PACKAGE_NAME}} private=true main=dist/index.js scripts.generate="tsoa spec-and-routes" scripts.build="npm run generate && tsc -p tsconfig.json" scripts.lint="npm run generate && tsc -p tsconfig.json --noEmit" scripts.test='npm run generate && node --import tsx --test $(find src -name "*.test.ts")' scripts.start="node dist/index.js"
  - npm install --include=dev --no-audit --no-fund express@4.21.2 tsoa@6.6.0
  - npm install --include=dev --no-audit --no-fund --save-dev typescript@5.6.3 @types/node@20.17.10 @types/express@4.17.21 tsx@4.23.15
verify:
  - npm run lint
  - npm run build
  - npm run test
mandatoryRecipes:
  - node-delivery-scripts
  - node-core-foundation
  - node-observability-and-env
  - node-feature-flags
  - node-boundary-validation
---
# Node TypeScript API

An Express API with tsoa controllers.

- `src/server.ts` builds the app: middleware first, then `RegisterRoutes(app)` from `src/generated/routes.ts`.
- `src/index.ts` starts the server on `PORT`.
- Controllers live in `src/features/<feature>/presentation/controllers/*Controller.ts`; `tsoa.json` finds them there. One health controller answers `GET /health`.
- `npm run generate` writes the routes and the OpenAPI spec to `src/generated/` (not committed). `build`, `lint` and `test` run it first.
- `npm run test` runs every `src/**/*.test.ts` file with the Node test runner and `tsx`, without a separate build.

## Changelog

### 2.0.0
- The scaffold is an Express and tsoa API: `tsoa.json`, `src/server.ts` (the app), `src/index.ts` (starts it), a health controller, and routes generated before every build, lint and test.
- TypeScript tests run directly with `node --import tsx --test`; the scaffold ships one for `GET /health`.

### 1.0.0
- First version.
