# Agent instructions

This repo is the Kleyman-Horgan family's recipe archive and weekly meal plans. **Read [SKILLS.md](SKILLS.md) first**;
it lists the skills and the rules every agent follows.

| Task | Follow |
|---|---|
| Plan next week's dinners | [skills/plan-week/SKILL.md](skills/plan-week/SKILL.md) |
| Add or import recipes | [skills/add-recipe/SKILL.md](skills/add-recipe/SKILL.md) |

Before committing:
- Every file follows [reference/schema.md](reference/schema.md).
- Check your changes with `cd app && npm ci && npm run validate`. If you can't run commands, the "Validate recipes"
  GitHub Action checks every push.
- The repo is public. Never commit tokens or other secrets.
