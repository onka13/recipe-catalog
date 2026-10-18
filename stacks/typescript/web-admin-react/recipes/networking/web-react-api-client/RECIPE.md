---
schemaVersion: 1
id: web-react-api-client
name: React SPA API Client & ServiceResult Envelope Bridge
version: 1.0.0
language: typescript
stack: web-admin-react
category: networking
standardType: networking-rest
interfacePort: IApiClient
order: 20
tags:
  - api-client
  - react
  - networking
  - service-result
  - envelope
  - toast-integration
parameters:
  - key: API_BASE_URL
    label: API Base URL
    description: Base URL path prefix for all API calls
    default: /api
    secret: false
verify:
  - npm run lint
---
# React SPA API Client & ServiceResult Envelope Bridge

Production TypeScript API client for React SPA portals. Handles ServiceResult<T> unwrapping, correlation ID propagation, centralized toast notifications for AppError codes, and client state-version headers (x-user-data-version).

## Instructions

### src/pages/**/*.tsx
Use apiClient.get<T> / apiClient.post<T> from 'src/core/api' instead of raw fetch calls to automatically unwrap ServiceResult envelopes and handle errors.

## Changelog

### 1.0.0
- First version.
