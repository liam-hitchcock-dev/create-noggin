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

# Check for local changes
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "noggin: cannot pull - local changes would be overwritten"
    echo ""
    git diff --stat 2>/dev/null | sed 's/^/  /'
    echo ""
    echo "  Run: noggin push   (commit first)"
    echo "  Run: noggin pull --force   (stash, pull, reapply)"
    exit 0
fi

# Pull and capture what changed
DIFF_SUMMARY=$(git diff --stat HEAD..origin/main 2>/dev/null)
COMMIT_SUMMARY=$(git log --oneline HEAD..origin/main 2>/dev/null)

# Rebase local work onto the incoming changes. Capture stderr instead of
# discarding it: a silent failure here used to leave a half-finished rebase
# while still printing "pulled", which wedged the repo until cleared by hand.
if ! git pull --quiet --rebase 2>/tmp/noggin-pull-err.log; then
    git rebase --abort 2>/dev/null || true
    echo "noggin: ⚠️  pull failed (rebase conflict) — aborted, repo left clean at local HEAD."
    echo "noggin: run 'noggin pull --force' to stash, pull, and reapply. Details:"
    sed 's/^/  /' /tmp/noggin-pull-err.log 2>/dev/null
    exit 1
fi

echo "noggin: pulled $BEHIND new change(s) from another machine"
echo ""
echo "Commits:"
echo "$COMMIT_SUMMARY" | sed 's/^/  /'
echo ""
echo "Files changed:"
echo "$DIFF_SUMMARY" | sed 's/^/  /'
