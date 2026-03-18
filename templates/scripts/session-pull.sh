#!/bin/bash
# Pull latest noggin changes and report what's new
# Resolve repo dir from this script's location (scripts/ is inside the config repo)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR" || exit 0

# Fetch and check if there are changes
git fetch --quiet 2>/dev/null || exit 0

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "noggin: up to date"
    exit 0
fi

# There are incoming changes - show what's new
BEHIND=$(git rev-list HEAD..origin/main --count 2>/dev/null || echo "0")

if [ "$BEHIND" = "0" ]; then
    echo "noggin: up to date"
    exit 0
fi

# Pull and capture what changed
DIFF_SUMMARY=$(git diff --stat HEAD..origin/main 2>/dev/null)
COMMIT_SUMMARY=$(git log --oneline HEAD..origin/main 2>/dev/null)

git pull --quiet --rebase 2>/dev/null

echo "noggin: pulled $BEHIND new change(s) from another machine"
echo ""
echo "Commits:"
echo "$COMMIT_SUMMARY" | sed 's/^/  /'
echo ""
echo "Files changed:"
echo "$DIFF_SUMMARY" | sed 's/^/  /'
