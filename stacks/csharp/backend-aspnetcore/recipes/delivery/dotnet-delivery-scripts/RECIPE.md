---
schemaVersion: 1
id: dotnet-delivery-scripts
name: .NET Delivery Scripts
version: 1.0.0
language: csharp
stack: backend-aspnetcore
category: delivery
standardType: delivery-scripts
order: 0
tags:
  - delivery
  - scripts
onlyIfMissing:
  - scripts/build.sh
  - scripts/test.sh
verify:
  - bash scripts/build.sh
---
# .NET Delivery Scripts

Writes scripts/build.sh (`dotnet build`) and scripts/test.sh (`dotnet test`) into the tier folder. The job engine runs them as the tier's build and test checks. They need only one solution or project file at the tier root, so they work on an existing C# solution too. Existing scripts are never overwritten.

`test.sh` names its failing-test pattern in a header comment: group 1 is the failing test's full name in `dotnet test` output (`  Failed Api.Tests.HealthEndpointTests.Get_health_answers_ok [73 ms]`, theories with their arguments).

## Changelog

### 1.0.0
- First version.
