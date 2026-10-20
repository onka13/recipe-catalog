---
schemaVersion: 1
id: aspnetcore-api
name: ASP.NET Core Web API
version: 1.0.0
language: csharp
stack: backend-aspnetcore
markerFile: Directory.Build.props
requiredTools:
  - dotnet
  - git
commands:
  - dotnet --version
verify:
  - dotnet build --nologo
  - dotnet test --nologo
mandatoryRecipes:
  - dotnet-delivery-scripts
---
# ASP.NET Core Web API

A solution (`Api.slnx`) with an ASP.NET Core Web API (`src/Api/`, controllers) and an xUnit test project (`tests/Api.Tests/`).

- `Directory.Build.props` is the tier's marker file and holds the shared build settings: `net10.0`, nullable reference types, implicit usings, warnings as errors.
- `HealthController` answers `GET /health`; `HealthEndpointTests` starts the app with `WebApplicationFactory<Program>` and checks it.

## Changelog

### 1.0.0
- First version.
