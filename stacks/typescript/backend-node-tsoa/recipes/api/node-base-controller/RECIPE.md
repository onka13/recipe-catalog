---
schemaVersion: 1
id: node-base-controller
name: Node.js TSOA Base Controller & Envelope Dispatcher
version: 1.0.0
language: typescript
stack: backend-node-tsoa
category: api
standardType: api-controller
interfacePort: IBaseController
order: 70
tags:
  - tsoa
  - controller
  - presentation
  - service-result
  - clean-architecture
  - openapi
dependsOn:
  - node-core-foundation
  - node-observability-and-env
packages:
  - name: tsoa
    version: ^6.2.1
    dev: false
verify:
  - npm run lint
---
# Node.js TSOA Base Controller & Envelope Dispatcher

Authoritative TSOA base controller providing authenticated tenant and user context extraction, standardized ServiceResult<T> envelope responses, and strict HTTP status mapping without bypassing OpenAPI/Swagger generation.

## Instructions

### src/features/*/presentation/controllers/*Controller.ts
Extend BaseController for all feature route controllers. Annotate methods with TSOA decorators (@Route, @Get, @Post, @SuccessResponse) and return this.successResponse(data) directly. Never call res.status().json() directly so that TSOA OpenAPI generator can infer exact response schemas.

## Changelog

### 1.0.0
- First version.
