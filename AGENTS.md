# Agent instructions

This repo is the Kleyman-Horgan family's recipe archive and weekly meal plans. **Read [SKILLS.md](SKILLS.md) first**;
it lists the skills and the rules every agent follows.

| Job | Skill |
|---|---|
| 1. **Plan next week's dinners** | [skills/plan-week](skills/plan-week/SKILL.md) |
| 2. **Adjust a week's plan** (swap or move nights, use what's at home) | [skills/adjust-plan](skills/adjust-plan/SKILL.md) |
| 3. **Run Sunday prep** (schedule it, split it, check it off) | [skills/sunday-prep](skills/sunday-prep/SKILL.md) |
| 4–5. **Cook tonight's dinner, and adapt it** (substitutions, change of plans) | [skills/cook-tonight](skills/cook-tonight/SKILL.md) |
| 6. **Find recipes** (by ingredients, rating, how often or how recently cooked) | [skills/find-recipes](skills/find-recipes/SKILL.md) |
| 7. **Rate a dinner** | [skills/rate-meal](skills/rate-meal/SKILL.md) |
| **Add or import recipes** | [skills/add-recipe](skills/add-recipe/SKILL.md) |

Before committing:
- Every file follows [reference/schema.md](reference/schema.md).
- Check your changes with `cd app && npm ci && npm run validate`. If you can't run commands, the "Validate recipes"
  GitHub Action checks every push.
- The repo is public. Never commit tokens or other secrets.
- Commit and push straight to `main`. Don't open pull requests for this repo.
