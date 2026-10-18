---
schemaVersion: 1
id: rest-network-client
name: Standard REST Network Client (Dio + Interceptors)
version: 1.0.0
language: dart
stack: mobile-flutter
category: networking
standardType: networking-rest
interfacePort: HttpClientPort
order: 30
tags:
  - http
  - dio
  - rest
  - api
  - networking
platformPermissions:
  - INTERNET
dependsOn:
  - core-foundation
parameters:
  - key: API_BASE_URL
    label: API Base URL
    description: Default base endpoint for HTTP requests
    default: https://api.example.com/v1
    secret: false
  - key: API_TIMEOUT_SECONDS
    label: Connection Timeout (Seconds)
    description: Connection and receive timeout in seconds
    default: "30"
    secret: false
packages:
  - name: dio
    version: ^5.7.0
    dev: false
verify:
  - flutter analyze
---
# Standard REST Network Client (Dio + Interceptors)

Robust Dio HTTP client with automatic logging interceptors, timeout controls, and Result<T> failure wrapping.

## Changelog

### 1.0.0
- First version.
