#!/bin/bash
set -euo pipefail

# Resolve repo dir from this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
cd "$REPO_DIR"

# Only push if there are changes
if [ -z "$(git status --porcelain)" ]; then
    exit 0
fi

CHANGED=$(git status --porcelain | awk '{print $2}' | xargs -I{} basename {} | sort -u | paste -sd ", " -)

git add -A
git commit -m "auto(scheduled): sync $(date '+%Y-%m-%d %H:%M')" -m "Changed: ${CHANGED:-unknown}"
git push --quiet
