#!/usr/bin/env bash
# Build check for this tier. The job engine runs it with this folder as the working directory;
# exit code 0 means pass. Edit it freely: it belongs to this project.
set -euo pipefail
cd "$(dirname "$0")/.."
dotnet build --nologo
