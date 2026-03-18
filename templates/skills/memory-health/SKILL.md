---
name: memory-health
description: Audit memory files for stale, outdated, or contradictory entries. Use when user says "check memory", "memory health", "clean up memory", or periodically during wrap-up.
---

# Memory Health Check

Review all project memory files and auto-memory for stale, outdated, or contradictory entries.

## What to check

1. **Read all memory files** in `~/.claude/projects/*/memory/` and the auto-memory MEMORY.md
2. **For each entry, evaluate:**
   - Is it still accurate? Cross-reference with actual code/config if possible
   - Is it duplicated elsewhere (CLAUDE.md, other memory files)?
   - Does it reference files, functions, or patterns that no longer exist?
   - Is the date/context still relevant or has the project moved on?
   - Does it contradict another memory entry?

3. **Categorize findings:**
   - **Stale**: References things that have changed or been removed
   - **Duplicate**: Same info exists in CLAUDE.md or another memory file
   - **Contradictory**: Conflicts with another entry or current code
   - **Healthy**: Still accurate and useful

4. **Present a report:**

```
Memory Health Report
====================

Scanned: X files, Y entries

Healthy: N entries
Stale: N entries
Duplicate: N entries
Contradictory: N entries

Issues:
1. [Stale] "Azure fallback removed" in MEMORY.md
   - References a change from months ago, now well-established
   - Suggest: remove (no longer needs remembering)

2. [Duplicate] "CDK custom log groups" in MEMORY.md
   - Same info in CLAUDE.md under "Key Patterns"
   - Suggest: remove from memory, keep in CLAUDE.md
```

5. **Ask user** which entries to remove, update, or keep
6. **Apply approved changes** to the memory files

## Rules

- Never delete entries without user approval
- When in doubt, mark as "review" rather than "stale"
- If you can verify against actual code, do so
- Keep the report concise — group similar issues
