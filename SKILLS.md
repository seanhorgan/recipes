# Recipe Agent Skills

This is the starting point for any AI agent (Claude, Hermes, Muse, or another) working in the Kleyman-Horgan Recipe
Archive.

## Skills

| Task | Skill |
|---|---|
| **Plan next week's dinners** (the main Sunday-morning job) | [skills/plan-week/SKILL.md](skills/plan-week/SKILL.md) |
| **Add or import recipes** | [skills/add-recipe/SKILL.md](skills/add-recipe/SKILL.md) |
| **Record how a dinner went** | Add `- YYYY-MM-DD ★★★★ note` under the recipe's `## Ratings`, dated the night it was cooked. There's one family rating per night. |

The skills follow the common `SKILL.md` format (a `name` and `description` header, then instructions):
- **Claude Code** loads them automatically from `.claude/skills/`.
- **Other agents** can load the `skills/` folder, or simply read the file for the task.

## How to work with the repo

Use the first option you have. Every skill explains all three.

1. **You can run commands (Node 22.18+):** `cd app && npm ci`, then:
   - `npm run plan -- context`: next week's file path, recent weeks, and every recipe with its rating and last-cooked date.
   - `npm run plan -- new <Monday> mon=<slug> tue=<slug> ...`: writes a plan with its Sunday Prep and shopping list,
     and checks variety.
   - `npm run validate`: checks every file against the format.
2. **You can fetch web pages:** the same planning context is published at
   https://seanhorgan.github.io/recipes/agent-context.md.
3. **You can only read and write repo files:** follow the formats in [protocols/schema.md](protocols/schema.md).
   The "Validate recipes" GitHub Action checks every push.

## Rules and formats

- **Family preferences, nutrition, and variety:** [protocols/planning.md](protocols/planning.md)
- **Shopping list rules:** [protocols/shopping.md](protocols/shopping.md)
- **Ingredients (aisle, how to buy, pantry staples):** [protocols/ingredients.md](protocols/ingredients.md)
- **File formats:** [protocols/schema.md](protocols/schema.md), with templates in [protocols/templates/](protocols/templates)
- **Importing recipes:** [protocols/importing.md](protocols/importing.md)

Key points:
- "When was this last cooked" comes from the weekly plans. Don't write cook dates into recipes.
- Weekly plans are named for the Monday of the week: `YYYY/Month/YYYY-MM-DD.md`.
- The repo is public. Never commit tokens or other secrets.

## Repository structure
- `/recipes`: Individual dish files.
- `/sauces`: Shared sauces and dressings, linked from recipe ingredients.
- `/drinks`: Beverage recipes (not yet in the standard format).
- `/2026`: Weekly meal plans, by month.
- `/protocols`: Rules, file formats, and the ingredient catalog.
- `/skills`: Step-by-step workflows for agents (linked into `.claude/skills` for Claude Code).
- `/app`: The family meal-planning web app, the validator, and the planning scripts.
