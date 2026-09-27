---
name: find-recipes
description: Find recipes in the Kleyman-Horgan recipes repo by ingredients on hand, rating, how often or how recently they were cooked, protein, or weeknight time. Use when asked what we can make with certain ingredients, for top-rated or favorite dinners, for dinners we haven't had in a while, or to browse or compare recipes.
---

# Find recipes

## Get the data
Use the first option that works for you:

1. **You can run commands (Node 22.18+):** `cd app && npm ci`, then:
   - `npm run plan -- find "salmon, lemon, asparagus"`: recipes using the most of those ingredients first.
   - `npm run plan -- find --sort stale|recent|most|rating|quick`: browse by longest since cooked, most recently
     cooked, most often cooked, top rated, or quickest weeknight time. You can combine this with ingredients.
   - `npm run plan -- context`: every recipe with its protein, dish style, times, rating, last-cooked date, and key
     ingredients.
2. **You can fetch web pages:** https://seanhorgan.github.io/recipes/agent-context.md has the same table as `context`.
3. **You can only read repo files:**
   - Ingredients are one per line under each recipe's `## Ingredients`.
   - Ratings are the dated `★` lines under `## Ratings`; the most recent one is the recipe's rating.
   - "Last cooked" and "times cooked" come from the weekly plans: search the `YYYY/Month/*.md` files for the recipe's
     file name.

## Answer
- For each suggestion, give the title, why it fits, protein, weeknight minutes, last cooked, and rating. Link it as
  `recipes/<slug>.md`.
- Respect [`reference/planning.md`](../../reference/planning.md): gluten-free, no red meat or pork, and no mushrooms.
  Flag anything cooked in the last 4 weeks.
- If nothing fits, propose a new dish and add it with the [add-recipe skill](../add-recipe/SKILL.md) if the family wants it.
- Finding recipes changes no files.
