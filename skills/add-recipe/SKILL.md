---
name: add-recipe
description: Add a new recipe (or import several from a doc or website) to the Kleyman-Horgan recipes repo in its standard format, with a Sunday Prep / Weeknight split, catalog entries for new ingredients, and validation. Use when asked to add, import, save, or create a recipe.
---

# Add a recipe

Use this for a single new dish, or to import several from an outside source (a Google Doc, a website, a chat with an
AI agent). The file format is in [`reference/schema.md`](../../reference/schema.md); read it first.

1. **Check for duplicates.** Search `recipes/` for the same dish (same title, or the same key ingredients and method).
   If it already exists, keep the repo version; it has the family's edits. Only add genuinely new details, such as a
   missing quantity, and mention them in the commit message.
2. **Create** `recipes/<title-in-kebab-case>.md` from [`reference/templates/recipe.md`](../../reference/templates/recipe.md):
   - Fill in the header: `protein`, `gluten_free`, `prep_minutes`, `weeknight_minutes`, `tags`.
   - One ingredient per line, `quantity unit name, note`. Keep the source's quantities, and don't invent any it
     doesn't give.
   - **Split the method** into `## Sunday Prep` (roasting, chopping, cooking grains, sauces, anything that keeps) and
     `## Weeknight` (what's left for the night, ideally 15–30 minutes). Seafood is cooked on the night.
   - Shared sauces live in `sauces/` and are linked from the ingredient list.
   - Apply [`reference/planning.md`](../../reference/planning.md): gluten-free by default, no mushrooms, and a
     `## Kid Boost` if the meal is light on protein.
3. **Add any new ingredients** to [`reference/ingredients.md`](../../reference/ingredients.md), with aisle, kind, and
   how to buy it.
4. **Don't add ratings.** The family adds those after cooking.
5. **Dated weekly plans** in the source become plan files named for the week's Monday (see `reference/schema.md`).
6. **Validate:** `cd app && npm ci && npm run validate` should show 0 errors and 0 warnings. If you can't run
   commands, check the "Validate recipes" GitHub Action after you push.
7. **Commit** with the message `Add recipe: <Title>` (or `Import recipes from <source>`).
