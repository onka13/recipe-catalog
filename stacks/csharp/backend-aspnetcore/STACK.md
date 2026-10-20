---
schemaVersion: 1
id: backend-aspnetcore
name: C# API (ASP.NET Core)
language: csharp
projectType: backend-api
requiredTools:
  - dotnet
  - git
deliveryScriptsRecipe: dotnet-delivery-scripts
defaultScaffold: aspnetcore-api
addPackage: dotnet add src/Api package {{NAME}} --version {{VERSION}}
addDevPackage: dotnet add tests/Api.Tests package {{NAME}} --version {{VERSION}}
---
# C# API (ASP.NET Core)

An ASP.NET Core Web API with controllers on the current long-term-support .NET, and an xUnit test project.

- `Directory.Build.props` at the tier root marks the tier and holds the build settings every project shares (target framework, nullable reference types, warnings as errors).
- `src/Api/` is the API project, `tests/Api.Tests/` its tests; the solution file at the tier root holds both.
- Packages go to the API project (`addPackage`) or to the test project (`addDevPackage`).
