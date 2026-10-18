---
schemaVersion: 1
id: flutter-delivery-scripts
name: Flutter Delivery Scripts
version: 1.0.0
language: dart
stack: mobile-flutter
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
# Flutter Delivery Scripts

Writes scripts/build.sh (flutter pub get, flutter analyze) and scripts/test.sh (flutter test) into the tier folder. The job engine runs them as the tier's build and test checks. Existing scripts are never overwritten.

## Changelog

### 1.0.0
- First version.
