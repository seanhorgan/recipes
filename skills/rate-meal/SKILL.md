---
name: rate-meal
description: Record the family's rating of a dinner in the Kleyman-Horgan recipes repo, as a dated star rating with an optional note in the recipe's Ratings section. Use when told how a meal went, asked to rate or review a recipe, or given feedback like "the kids loved it" or "too dry".
---

# Rate a meal

## 1. Write the rating
Add one line under the recipe's `## Ratings` section, which is the last section of the file. Create the section if it
doesn't exist:

```markdown
## Ratings
- 2026-09-29 ★★★★ Kids asked for seconds
```

- **Date:** the night it was cooked (the date of that day in the weekly plan), not the day you're writing.
- **Stars:** 1–5 `★`. The note is optional; keep it short.
- **One family rating per night.** If a line for that date already exists, replace it. The recipe's rating is its most
  recent line.
- If the stars aren't clear from what you were told ("it was fine"), ask.

## 2. Act on feedback
If the feedback suggests changing the recipe ("too dry, add more oil", "double the beans"), offer to make the change.
Make it only if the family agrees, following [add-recipe](../add-recipe/SKILL.md).

## 3. Validate and commit
- **Validate:** `cd app && npm run validate` (or check the "Validate recipes" GitHub Action).
- **Commit:** use the message `Rate <Recipe title> ★★★★`.
- The family can also rate in the app, on the recipe page or the **Tonight** screen.
