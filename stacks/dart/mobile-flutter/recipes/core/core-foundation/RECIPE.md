---
schemaVersion: 1
id: core-foundation
name: Flutter Core Foundation (LogHelper, Result, Failures)
version: 1.0.1
language: dart
stack: mobile-flutter
category: core
standardType: logging
interfacePort: LoggerPort
order: 10
tags:
  - logging
  - errors
  - result-type
  - core-utilities
parameters:
  - key: APP_DISPLAY_NAME
    label: Application Display Name
    description: User-facing title of the application
    default: App
    secret: false
verify:
  - flutter analyze
---
# Flutter Core Foundation (LogHelper, Result, Failures)

Foundational logging utility, Result<T, Failure> functional monad, and universal domain failure hierarchy.

## Changelog

### 1.0.1
- Fixed: `flutter analyze` failed. `Result.when` called the `Failure` value instead of the `failure` callback (the pattern variable hid the parameter), and `UnexpectedFailure` now uses a super parameter.

### 1.0.0
- First version.
