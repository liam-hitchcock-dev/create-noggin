# noggin

Portable Claude Code config. Skills, settings, memory, and scripts — synced across machines.

## How it works

Everything in this repo is symlinked into `~/.claude/`. When Claude writes memory, updates settings, or you install a skill, the change is already in this repo. Push and pull to sync between machines.

### Auto-sync hooks

- **SessionStart**: pulls latest config when you open Claude
- **PostToolUse**: auto-commits and pushes when memory or skills are written
- **Stop**: logs a session entry to session-log.md

### Scheduled sync

A launchd agent pushes any uncommitted changes every 10 minutes as a safety net.

## Commands

```bash
noggin status   # sync status, pending changes, symlink health
noggin push     # commit and push changes
noggin pull     # pull latest from remote
noggin log      # recent sync history
noggin diff     # show uncommitted changes
noggin install  # re-run install (fix symlinks)
```

## Structure

```
skills/          # global Claude Code skills (symlinked to ~/.claude/skills)
scripts/         # helper scripts (symlinked to ~/.claude/scripts)
projects/        # per-project memory files (symlinked per-project)
settings.json    # global settings + hooks (symlinked to ~/.claude/settings.json)
session-log.md   # auto-generated session log
```

## Adding skills

Drop skill folders into `skills/`. They're immediately available in Claude Code via the symlink.

## Adding project memory

Project memory directories use machine-specific paths. If your machines share the same directory structure, symlink them. Otherwise, copy and manage manually.
