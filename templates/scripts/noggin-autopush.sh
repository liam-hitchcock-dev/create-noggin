#!/bin/bash
# Auto-commit and push when Claude writes to memory files
# Called from PostToolUse hook on Write/Edit

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null)

# Only trigger for files inside the config repo (which is symlinked from ~/.claude)
case "$FILE_PATH" in
    */.claude/projects/*/memory/*|*/projects/*/memory/*|*/.claude/skills/*|*/skills/*|*/.claude/settings.json|*/settings.json)
        ;;
    *)
        exit 0
        ;;
esac

# Resolve repo dir from this script's location (scripts/ is inside the config repo)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR" || exit 0

# Skip if no changes
[ -z "$(git status --porcelain)" ] && exit 0

# Build a descriptive commit message
FNAME=$(basename "$FILE_PATH")
CATEGORY=""
case "$FILE_PATH" in
    */memory/*)   CATEGORY="memory" ;;
    */skills/*)   CATEGORY="skill" ;;
    *settings*)   CATEGORY="settings" ;;
    *)            CATEGORY="config" ;;
esac

# Resolve the symlinked path to the repo-relative path
REAL_PATH=$(realpath "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
REPO_REL_PATH=${REAL_PATH#$REPO_DIR/}

# Capture diff of just the triggered file BEFORE staging
DIFF_SUMMARY=$(git diff -- "$REPO_REL_PATH" 2>/dev/null \
    | grep '^[+-]' | grep -v '^[+-]\{3\}' | head -8 \
    | sed 's/^+/+ /' | sed 's/^-/- /' || echo "")

# For new untracked files, show first few content lines
if [ -z "$DIFF_SUMMARY" ]; then
    UNTRACKED=$(git ls-files --others --exclude-standard | head -1)
    if [ -n "$UNTRACKED" ]; then
        DIFF_SUMMARY="+ new file: $UNTRACKED"
    fi
fi

git add -A
git commit --quiet -m "auto($CATEGORY): update $FNAME" -m "${DIFF_SUMMARY:-no diff summary}"
git push --quiet &
disown

exit 0
