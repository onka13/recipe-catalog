---
schemaVersion: 1
id: backend-node-tsoa
name: Node TypeScript API (Express, tsoa)
language: typescript
projectType: backend-api
requiredTools:
  - node
  - npm
  - git
deliveryScriptsRecipe: node-delivery-scripts
defaultScaffold: node-tsoa-api
addPackage: npm install --include=dev {{NAME}}@{{VERSION}}
addDevPackage: npm install --include=dev --save-dev {{NAME}}@{{VERSION}}
---
# Node TypeScript API (Express, tsoa)

A TypeScript HTTP API on Express, with tsoa controllers. Recipes add infrastructure (errors, logging, configuration, repositories, security guards) as small modules with interfaces.
