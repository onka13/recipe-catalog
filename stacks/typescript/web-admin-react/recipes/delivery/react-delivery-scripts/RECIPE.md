---
schemaVersion: 1
id: react-delivery-scripts
name: React Delivery Scripts
version: 1.0.0
language: typescript
stack: web-admin-react
category: delivery
standardType: delivery-scripts
order: 0
tags:
  - delivery
  - scripts
onlyIfMissing:
  - scripts/build.sh
  - scripts/test.sh
verify:
  - bash scripts/build.sh
---
# React Delivery Scripts

Writes scripts/build.sh (npm install, npm run build) and scripts/test.sh (npm run test) into the tier folder. The job engine runs them as the tier's build and test checks. Existing scripts are never overwritten.

## Changelog

### 1.0.0
- First version.
