---
schemaVersion: 1
id: mobile-flutter
name: Flutter mobile app
language: dart
projectType: mobile-app
requiredTools:
  - flutter
  - git
deliveryScriptsRecipe: flutter-delivery-scripts
defaultScaffold: flutter-app
addPackage: flutter pub add {{NAME}}:{{VERSION}}
addDevPackage: flutter pub add dev:{{NAME}}:{{VERSION}}
---
# Flutter mobile app

A Flutter app for Android, iOS and web. Recipes add capabilities behind small Dart interfaces (ports), with a mock adapter for tests and a real adapter for production.
