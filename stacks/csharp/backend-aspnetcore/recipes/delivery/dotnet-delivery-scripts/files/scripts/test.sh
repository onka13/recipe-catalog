#!/usr/bin/env bash
# Test run for this tier. The job engine runs it with this folder as the working directory;
# exit code 0 means pass. Edit it freely: it belongs to this project.
# failing-test-pattern: ^\s+Failed (.+) \[[^\]]+\]\s*$
set -euo pipefail
cd "$(dirname "$0")/.."
dotnet test --nologo
