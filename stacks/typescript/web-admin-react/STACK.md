---
schemaVersion: 1
id: web-admin-react
name: React web admin
language: typescript
projectType: web-app
requiredTools:
  - node
  - npm
  - git
deliveryScriptsRecipe: react-delivery-scripts
defaultScaffold: react-web
addPackage: npm install --include=dev {{NAME}}@{{VERSION}}
addDevPackage: npm install --include=dev --save-dev {{NAME}}@{{VERSION}}
---
# React web admin

A React single-page app built with Vite and TypeScript, for admin and back-office screens.
