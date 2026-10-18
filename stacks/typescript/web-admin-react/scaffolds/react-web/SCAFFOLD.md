---
schemaVersion: 1
id: react-web
name: React Web App
version: 1.0.1
language: typescript
stack: web-admin-react
markerFile: package.json
requiredTools:
  - node
  - npm
  - git
commands:
  - npx -y create-vite@5.5.5 vite-scaffold --template react-ts
  - cp -a vite-scaffold/. . && rm -rf vite-scaffold
  - npm pkg set name={{PACKAGE_NAME}} scripts.test="node --test"
  - npm install --include=dev --no-audit --no-fund
verify:
  - npm run build
mandatoryRecipes:
  - react-delivery-scripts
---
# React Web App

A React and TypeScript app from the Vite template, with a test script that runs node --test.

## Changelog

### 1.0.1
- Fixed: create-vite stopped at its package-name prompt without a terminal (the folder name `.vite-scaffold` is not a valid package name), so the scaffold created nothing.

### 1.0.0
- First version.
