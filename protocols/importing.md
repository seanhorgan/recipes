# Importing Recipes

Use this when adding recipes from an outside source (a Google Doc, a website, a chat with an AI agent).

1. **Check for duplicates.** Search `recipes/` for the same dish (same title, or the same key ingredients and method).
   If it already exists, keep the repo version: it has the family's edits. Only add genuinely new details, such as
   a missing quantity, and mention it in the commit message.
2. **Create the file** from [`templates/recipe.md`](templates/recipe.md) as `recipes/<title-in-kebab-case>.md`,
   following [`schema.md`](schema.md):
   - Fill in the header: `protein`, `gluten_free`, `prep_minutes`, `weeknight_minutes`, `tags`.
   - One ingredient per line, `quantity unit name, note`. Keep the source's quantities, and don't invent ones it doesn't give.
   - **Split the method** into `## Sunday Prep` (roasting, chopping, cooking grains, sauces, anything that keeps) and
     `## Weeknight` (what's left for the night, ideally 15–30 minutes). Seafood is cooked on the night.
   - Shared sauces go in `sauces/` and are linked from the ingredient list.
   - Apply [`planning.md`](planning.md): gluten-free defaults, and a `## Kid Boost` if the meal is light on protein.
3. **Add new ingredients** to [`ingredients.md`](ingredients.md) (aisle, kind, how to buy).
4. **Don't add ratings.** Ratings come from the family after cooking.
5. **Dated weekly plans** in the source become plan files named for the week's Monday (see `schema.md`).
6. **Run the validator** (`cd app && npm run validate`) and fix every error and warning before committing.
