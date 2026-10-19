---
schemaVersion: 1
id: app-theming
name: Material 3 Adaptive Theme System
version: 1.0.1
language: dart
stack: mobile-flutter
category: ui
standardType: custom
interfacePort: ThemePort
order: 15
tags:
  - theming
  - material-3
  - colors
  - dark-mode
  - ui
dependsOn:
  - core-foundation
parameters:
  - key: PRIMARY_COLOR_HEX
    label: Primary Brand Color (Hex)
    description: Primary seed color for Material 3 ColorScheme
    default: 2563EB
    secret: false
verify:
  - flutter analyze
---
# Material 3 Adaptive Theme System

Material 3 dynamic color scheme, adaptive light/dark mode scaffolding, and typography scales.

## Instructions

### lib/main.dart
In lib/main.dart: 1. Import package:{{PACKAGE_NAME}}/core/theme/app_theme.dart. 2. In MaterialApp, set theme: AppTheme.lightTheme, darkTheme: AppTheme.darkTheme, themeMode: ThemeMode.system. Preserve existing home widget.

## Changelog

### 1.0.1
- Uses `CardThemeData`, which `ThemeData.cardTheme` takes since Flutter 3.27; `CardTheme` failed `flutter analyze`.

### 1.0.0
- First version.
