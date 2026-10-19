---
schemaVersion: 1
id: key-value-storage
name: Persistent Key-Value Storage (SharedPreferences Adapter)
version: 1.0.1
language: dart
stack: mobile-flutter
category: storage
standardType: key-value-storage
interfacePort: StorageServicePort
order: 25
tags:
  - storage
  - shared-preferences
  - cache
  - persistence
  - key-value
dependsOn:
  - core-foundation
parameters:
  - key: STORAGE_KEY_PREFIX
    label: Storage Key Prefix
    description: Prefix added to keys to prevent namespace collision
    default: app_
    secret: false
packages:
  - name: shared_preferences
    version: ^2.3.2
    dev: false
verify:
  - flutter analyze
---
# Persistent Key-Value Storage (SharedPreferences Adapter)

Cross-platform persistent key-value caching and preference store using SharedPreferences Port-Adapter.

## Instructions

### lib/main.dart
Add `import 'package:{{PACKAGE_NAME}}/shared/services/shared_preferences_storage_service.dart';` with the other imports. In `main()`, add `WidgetsFlutterBinding.ensureInitialized();` and `SharedPreferencesStorageService().init();` before `runApp(...)`.

## Changelog

### 1.0.1
- The instruction for `lib/main.dart` names the import of `SharedPreferencesStorageService`; without it the call did not compile.

### 1.0.0
- First version.
