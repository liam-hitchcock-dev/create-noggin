#!/bin/bash
# Append a session end timestamp to the session log
# Called from Stop hook

# Resolve repo dir from this script's location (scripts/ is inside the config repo)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$REPO_DIR/session-log.md"

# Create log file with header if it doesn't exist
if [ ! -f "$LOG_FILE" ]; then
    cat > "$LOG_FILE" <<'HEADER'
# Session Log

Auto-generated log of Claude Code sessions.

HEADER
fi

# Get current project from working directory
PROJECT=$(basename "$(pwd)" 2>/dev/null || echo "unknown")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo "| $TIMESTAMP | $PROJECT | session ended |" >> "$LOG_FILE"
