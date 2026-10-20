---
schemaVersion: 1
id: node-ioc-container
name: Node.js Lightweight Type-Safe IoC Container
version: 1.1.0
language: typescript
stack: backend-node-tsoa
category: architecture
standardType: custom
interfacePort: IServiceContainer
order: 22
tags:
  - ioc
  - dependency-injection
  - di
  - inversion-of-control
  - mocking
  - testability
  - dry-run
dependsOn:
  - node-core-foundation
onlyIfMissing:
  - src/core/di/registry.ts
verify:
  - npm run lint
---
# Node.js Lightweight Type-Safe IoC Container

Zero-dependency, reflection-free, type-safe Inversion of Control (IoC) and Dependency Injection (DI) container. Supports singleton and transient registrations, factory providers, dry-run mock swapping, and scoped test overrides without decorator boilerplate.

## Instructions

### src/server.ts
In `createServer`, before any middleware, call `registerServices()` imported from `./core/di/registry`.

## Conventions

### src/core/di/registry.ts
Bind all repository ports and external gateway adapters (e.g. IPaymentGateway, INotificationGateway) to the container in `registerServices`. Use container.override(token, mockAdapter) in test suites to prevent live side effects without polluting business code with dryRun flags.

## Changelog

### 1.1.0
- Ships `src/core/di/registry.ts` (written only when the project has none) with `registerServices()`; the instruction calls it from `createServer` in `src/server.ts`. Binding ports there is now a convention for later code, because a new project has nothing to bind yet.
- Adds a test of the container.

### 1.0.0
- First version.
