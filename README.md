# create-noggin

Sync your Claude Code config across machines. One command sets up a git-backed repo that keeps your skills, memory, settings, and scripts in sync.

```bash
npx create-noggin
```

That's it. Answer a few questions and you're done.

## What it does

Your `~/.claude/` directory has skills, memory files, scripts, and settings. Normally these live on one machine and nowhere else. Noggin puts them in a git repo and symlinks them back into `~/.claude/`, so every change is version-controlled and pushable.

```
~/.claude/skills/     ->  ~/.claude-config/skills/
~/.claude/scripts/    ->  ~/.claude-config/scripts/
~/.claude/settings.json  ->  ~/.claude-config/settings.json
```

When Claude writes a memory file or you install a skill, the change lands in the repo automatically. Push it, pull it on another machine, done.

## What gets set up

- A config repo (default `~/.claude-config/`) with git initialized
- Symlinks from `~/.claude/` into the repo
- Claude Code hooks for auto-sync:
  - **SessionStart** pulls latest changes when you open Claude
  - **PostToolUse** commits and pushes when memory or skills change
  - **Stop** logs session timestamps
- Optional GitHub private repo (if you have `gh` installed)
- Optional launchd auto-push every 10 minutes (macOS)
- Optional `noggin` CLI for manual sync operations

## The noggin CLI

```bash
noggin status   # sync state, pending changes, symlink health
noggin push     # commit and push
noggin pull     # pull latest
noggin log      # recent commits
noggin diff     # uncommitted changes
noggin doctor   # detect and repair broken symlinks
noggin update   # update noggin scripts to latest version
```

### A note on skill installers

Tools like `npx skills-installer` can replace your `~/.claude/skills/` symlink with a real directory. If `noggin status` shows `[not linked, real file]`, run `noggin doctor` to merge any new content back into the repo and restore the symlinks.

## Options

```bash
npx create-noggin --yes              # accept all defaults, no prompts
npx create-noggin --dir=~/my-config  # custom directory
npx create-noggin --no-symlink       # skip symlinking (for testing)
```

## Syncing to a second machine

On the new machine:

```bash
git clone git@github.com:you/claude-noggin.git ~/.claude-config
cd ~/.claude-config
bash install.sh
```

The install script recreates the symlinks.

## Repo structure

```
skills/          # Claude Code skills (symlinked)
scripts/         # hook scripts (symlinked)
projects/        # per-project memory
settings.json    # global settings + hooks (symlinked)
session-log.md   # auto-generated session log
noggin           # CLI tool
autopush.sh      # scheduled push script
```

## Requirements

- Node.js 18+
- git
- `gh` CLI (optional, for GitHub repo creation)
- macOS (optional, for launchd auto-push)

## License

MIT
