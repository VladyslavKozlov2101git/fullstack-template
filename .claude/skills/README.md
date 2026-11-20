# skills

Project skills — one folder per skill, each with a `SKILL.md`:

```
.claude/skills/<name>/SKILL.md
---
name: <name>
description: <when Claude should load this — triggers, not a summary>
---
```

Here: `feature` (the SDD cycle for new behaviour) and `fix` (bugs, traced back to the spec).
API-specific skills live in `apps/api/.claude/skills/`, vault skills in `docs/.claude/skills/`.

Add one when a workflow in this repo gets repeated often enough to be worth writing down; don't
pre-write skills for workflows that don't exist yet.
