---
schemaVersion: 1
id: aspnetcore-core-foundation
name: ASP.NET Core Foundation (Problem Details, Typed Settings, Health Checks)
version: 1.0.1
language: csharp
stack: backend-aspnetcore
category: core
standardType: custom
order: 10
tags:
  - errors
  - problem-details
  - configuration
  - options
  - health-checks
verify:
  - dotnet build --nologo
  - dotnet test --nologo
---
# ASP.NET Core Foundation (Problem Details, Typed Settings, Health Checks)

The base the other C# recipes build on: an exception taxonomy (`AppException` with `InvalidInputException`, `ForbiddenException`, `NotFoundException`, `ConflictException`) answered as RFC 9457 problem details by one `IExceptionHandler`, typed settings bound from the `Api` section and validated at startup (`ApiOptions`), and a readiness endpoint `GET /health/ready` from ASP.NET Core health checks. An unexpected exception is logged and answered with 500 without its message.

## Instructions

### src/Api/Program.cs
Add `using Api.Core;` at the top. After `builder.Services.AddControllers();`, call `builder.Services.AddCoreFoundation(builder.Configuration);`. Right after `var app = builder.Build();`, call `app.UseCoreFoundation();`.

### src/Api/appsettings.json
Add a top-level `"Api": { "ServiceName": "{{PROJECT_NAME}}" }` section.

## Conventions

### src/Api/**/*.cs
Signal an expected failure by throwing one of the `AppException` types from `Api.Core.Errors`; never build error responses by hand in a controller. Settings a service needs go into an options class with data annotations, bound and validated like `ApiOptions`, and are read through `IOptions<T>`.

## Changelog

### 1.0.1
- `verify` also runs `dotnet test`, so the two tests the recipe ships are checked when it is applied.

### 1.0.0
- First version.
