---
schemaVersion: 1
id: flutter-app
name: Flutter App
version: 1.0.0
language: dart
stack: mobile-flutter
markerFile: pubspec.yaml
requiredTools:
  - flutter
  - git
commands:
  - flutter create --project-name {{PACKAGE_NAME}} --org com.{{PACKAGE_NAME}} --platforms android,ios,web .
verify:
  - flutter analyze
mandatoryRecipes:
  - flutter-delivery-scripts
  - core-foundation
  - app-theming
---
# Flutter App

A Flutter app created with flutter create (Android, iOS and web), checked with flutter analyze.

## Changelog

### 1.0.0
- First version.
