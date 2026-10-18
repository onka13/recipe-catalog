#!/usr/bin/env bash
# Test run for this tier. The job engine runs it with this folder as the working directory;
# exit code 0 means pass. Edit it freely: it belongs to this project.
set -euo pipefail
cd "$(dirname "$0")/.."
npm install --include=dev --no-audit --no-fund
npm run test
