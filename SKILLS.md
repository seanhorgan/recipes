# Recipe Agent Skills

This document defines the operational protocols for AI agents managing the Kleyman-Horgan Recipe Archive.

**Before writing any file, read [protocols/schema.md](protocols/schema.md).** Every recipe, sauce, and weekly plan
follows it so the family's app can read them. After editing, run the validator and fix every error and warning:

```sh
cd app && npm install && npm run validate
```

## Capabilities

### Meal Planning
- Refer to [protocols/planning.md](protocols/planning.md) for family preferences, variety rules, and growth-stage protein requirements.
- Store weekly plans in `YYYY/Month/YYYY-MM-DD.md`, named for the Monday of the week (template: [protocols/templates/plan.md](protocols/templates/plan.md)).
- Work out when a recipe was last cooked from the weekly plans. Don't write cook dates into recipes.

### Shopping List Generation
- Refer to [protocols/shopping.md](protocols/shopping.md) for de-duplication, quantity merging, and dietary defaults.
- Refer to [protocols/ingredients.md](protocols/ingredients.md) for aisles, pantry staples, and how to buy each item.

### Recipe Entry & Import
- Follow [protocols/importing.md](protocols/importing.md). New recipes start from [protocols/templates/recipe.md](protocols/templates/recipe.md).
- Every recipe splits its method into `## Sunday Prep` and `## Weeknight`.

### Ratings
- One family rating per cook, added to the recipe's `## Ratings` as `- YYYY-MM-DD ★★★★ note`, dated the night it was cooked.

## Repository Structure
- `/recipes`: Individual dish files.
- `/sauces`: Shared sauces and dressings, linked from recipe ingredients.
- `/drinks`: Beverage recipes (not yet in the standard format).
- `/2026`: Archive of weekly meal plans.
- `/protocols`: Logic, rules, file formats, and the ingredient catalog.
- `/app`: The family meal-planning web app and the validator.
