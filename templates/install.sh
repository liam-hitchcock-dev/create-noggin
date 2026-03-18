#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing claude-config from $REPO_DIR"
echo "Target: $CLAUDE_DIR"
echo ""

# Create .claude dir if it doesn't exist
mkdir -p "$CLAUDE_DIR"

# Symlink directories
for dir in skills scripts; do
    target="$CLAUDE_DIR/$dir"
    source="$REPO_DIR/$dir"

    if [ -L "$target" ]; then
        echo "  $dir/ already linked"
    elif [ -d "$target" ]; then
        echo "  $dir/ exists as a real directory. Back it up? (y/n)"
        read -r answer
        if [ "$answer" = "y" ]; then
            mv "$target" "$target.bak.$(date +%s)"
            ln -s "$source" "$target"
            echo "  $dir/ backed up and linked"
        else
            echo "  $dir/ skipped"
        fi
    else
        ln -s "$source" "$target"
        echo "  $dir/ linked"
    fi
done

# Symlink individual files
for file in settings.json; do
    target="$CLAUDE_DIR/$file"
    source="$REPO_DIR/$file"

    if [ -L "$target" ]; then
        echo "  $file already linked"
    elif [ -f "$target" ]; then
        echo "  $file exists. Back it up and replace? (y/n)"
        read -r answer
        if [ "$answer" = "y" ]; then
            mv "$target" "$target.bak.$(date +%s)"
            ln -s "$source" "$target"
            echo "  $file backed up and linked"
        else
            echo "  $file skipped"
        fi
    else
        ln -s "$source" "$target"
        echo "  $file linked"
    fi
done

# Symlink project memory directories
if [ -d "$REPO_DIR/projects" ]; then
    echo ""
    echo "Linking project memory..."
    for proj_dir in "$REPO_DIR"/projects/*/memory; do
        [ -d "$proj_dir" ] || continue
        proj=$(basename "$(dirname "$proj_dir")")
        target_dir="$CLAUDE_DIR/projects/$proj"
        target="$target_dir/memory"
        mkdir -p "$target_dir"

        if [ -L "$target" ]; then
            echo "  projects/$proj/memory already linked"
        elif [ -d "$target" ]; then
            echo "  projects/$proj/memory exists. Back it up? (y/n)"
            read -r answer
            if [ "$answer" = "y" ]; then
                mv "$target" "$target.bak.$(date +%s)"
                ln -s "$proj_dir" "$target"
                echo "  projects/$proj/memory backed up and linked"
            else
                echo "  projects/$proj/memory skipped"
            fi
        else
            ln -s "$proj_dir" "$target"
            echo "  projects/$proj/memory linked"
        fi
    done
fi

# Symlink plugin configs
if [ -d "$REPO_DIR/plugins" ]; then
    mkdir -p "$CLAUDE_DIR/plugins"
    for file in "$REPO_DIR"/plugins/*.json; do
        [ -f "$file" ] || continue
        fname=$(basename "$file")
        target="$CLAUDE_DIR/plugins/$fname"
        source="$file"

        if [ -L "$target" ]; then
            echo "  plugins/$fname already linked"
        elif [ -f "$target" ]; then
            echo "  plugins/$fname exists. Back it up? (y/n)"
            read -r answer
            if [ "$answer" = "y" ]; then
                mv "$target" "$target.bak.$(date +%s)"
                ln -s "$source" "$target"
                echo "  plugins/$fname backed up and linked"
            else
                echo "  plugins/$fname skipped"
            fi
        else
            ln -s "$source" "$target"
            echo "  plugins/$fname linked"
        fi
    done
fi

echo ""
echo "Done. Restart Claude Code to pick up changes."
