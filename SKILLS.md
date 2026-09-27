# Recipe Agent Skills

This is the starting point for any AI agent (Claude, Hermes, Muse, or another) working in the Kleyman-Horgan Recipe
Archive.

## Skills

| Job | Skill |
|---|---|
| 1. **Plan next week's dinners** | [skills/plan-week](skills/plan-week/SKILL.md) |
| 2. **Adjust a week's plan** (swap or move nights, use what's at home) | [skills/adjust-plan](skills/adjust-plan/SKILL.md) |
| 3. **Run Sunday prep** (schedule it, split it, check it off) | [skills/sunday-prep](skills/sunday-prep/SKILL.md) |
| 4–5. **Cook tonight's dinner, and adapt it** (substitutions, change of plans) | [skills/cook-tonight](skills/cook-tonight/SKILL.md) |
| 6. **Find recipes** (by ingredients, rating, how often or how recently cooked) | [skills/find-recipes](skills/find-recipes/SKILL.md) |
| 7. **Rate a dinner** | [skills/rate-meal](skills/rate-meal/SKILL.md) |
| **Add or import recipes** | [skills/add-recipe](skills/add-recipe/SKILL.md) |

The skills follow the common `SKILL.md` format (a `name` and `description` header, then instructions):
- **Claude Code** loads them automatically from `.claude/skills/`.
- **Agents that read `AGENTS.md`** (Codex, Cursor, Copilot, and others) and **Gemini CLI** (which reads `GEMINI.md`)
  are pointed here by those files at the repo root.
- **Other agents** (for example Hermes or Muse) can load the `skills/` folder, or simply read the file for the task.

## How to work with the repo

Use the first option you have. Every skill explains all three.

1. **You can run commands (Node 22.18+):** `cd app && npm ci`, then:
   - `npm run plan -- context`: next week's file path, recent weeks, and every recipe with its rating and last-cooked date.
   - `npm run plan -- new <Monday> mon=<slug> tue=<slug> ...`: writes a plan with its Sunday Prep and shopping list,
     and checks variety. `fill <Monday>` rebuilds those lists after an edit; `check <Monday>` reviews a plan.
   - `npm run plan -- find "salmon, lemon" [--sort stale|recent|most|rating|quick]`: finds recipes.
   - `npm run validate`: checks every file against the format.
2. **You can fetch web pages:** the same planning context is published at
   https://seanhorgan.github.io/recipes/agent-context.md.
3. **You can only read and write repo files:** follow the formats in [reference/schema.md](reference/schema.md).
   The "Validate recipes" GitHub Action checks every push.

## Reference

`skills/` says *how* to do a task; `reference/` holds the rules, data, and formats that the skills, the app, and the
family all share. Skills link here instead of repeating these, so each rule lives in one place.

- **Family preferences, nutrition, and variety:** [reference/planning.md](reference/planning.md)
- **Shopping list rules:** [reference/shopping.md](reference/shopping.md)
- **Ingredients (aisle, how to buy, pantry staples):** [reference/ingredients.md](reference/ingredients.md)
- **File formats:** [reference/schema.md](reference/schema.md), with templates in [reference/templates/](reference/templates)

Key points:
- "When was this last cooked" comes from the weekly plans. Don't write cook dates into recipes.
- Weekly plans are named for the Monday of the week: `YYYY/Month/YYYY-MM-DD.md`.
- The repo is public. Never commit tokens or other secrets.

## Repository structure
- `/recipes`: Individual dish files.
- `/sauces`: Shared sauces and dressings, linked from recipe ingredients.
- `/drinks`: Beverage recipes (not yet in the standard format).
- `/2026`: Weekly meal plans, by month.
- `/reference`: Shared rules, file formats, and the ingredient catalog.
- `/skills`: Step-by-step workflows for agents (linked into `.claude/skills` for Claude Code).
- `/app`: The family meal-planning web app, the validator, and the planning scripts.
