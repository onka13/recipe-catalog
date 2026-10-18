---
schemaVersion: 1
id: node-ioc-container
name: Node.js Lightweight Type-Safe IoC Container
version: 1.0.0
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
verify:
  - npm run lint
---
# Node.js Lightweight Type-Safe IoC Container

Zero-dependency, reflection-free, type-safe Inversion of Control (IoC) and Dependency Injection (DI) container. Supports singleton and transient registrations, factory providers, dry-run mock swapping, and scoped test overrides without decorator boilerplate.

## Instructions

### src/core/di/registry.ts
Bind all repository ports and external gateway adapters (e.g. IPaymentGateway, INotificationGateway) to the container. Use container.override(token, mockAdapter) in test suites to prevent live side effects without polluting business code with dryRun flags.

## Changelog

### 1.0.0
- First version.
