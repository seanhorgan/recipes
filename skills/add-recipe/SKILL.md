---
name: add-recipe
description: Add a new recipe (or import several from a doc or website) to the Kleyman-Horgan recipes repo in its standard format, with a Sunday Prep / Weeknight split, catalog entries for new ingredients, and validation. Use when asked to add, import, save, or create a recipe.
---

# Add a recipe

The full rules are in [`protocols/importing.md`](../../protocols/importing.md) and the file format is in
[`protocols/schema.md`](../../protocols/schema.md). Read both first. In short:

1. **Check for duplicates** in `recipes/` (same dish, or the same key ingredients and method). If the dish already
   exists, keep the repo version; it has the family's edits.
2. **Create** `recipes/<title-in-kebab-case>.md` from [`protocols/templates/recipe.md`](../../protocols/templates/recipe.md):
   - Fill in the header: `protein`, `gluten_free`, `prep_minutes`, `weeknight_minutes`, `tags`.
   - One ingredient per line, `quantity unit name, note`. Keep the source's quantities, and don't invent any.
   - **Split the method** into `## Sunday Prep` (roasting, chopping, grains, sauces, anything that keeps) and
     `## Weeknight` (15–30 minutes on the night; seafood is cooked on the night).
   - Shared sauces live in `sauces/` and are linked from the ingredient list.
   - Apply [`protocols/planning.md`](../../protocols/planning.md): gluten-free by default, no mushrooms, and a
     `## Kid Boost` if the meal is light on protein.
3. **Add any new ingredients** to [`protocols/ingredients.md`](../../protocols/ingredients.md), with aisle, kind, and
   how to buy it.
4. **Validate:** `cd app && npm ci && npm run validate` should show 0 errors and 0 warnings. If you can't run
   commands, check the "Validate recipes" GitHub Action after you push.
5. **Commit** with the message `Add recipe: <Title>`. Don't add ratings; the family adds those after cooking.
