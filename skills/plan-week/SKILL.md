---
name: plan-week
description: Plan a week of family dinners in the Kleyman-Horgan recipes repo. Picks dinners that fit the family's diet and variety rules, writes the weekly plan file with a Sunday Prep checklist and a consolidated shopping list, and validates it. Use when asked to plan meals, dinners, or the menu for a week.
---

# Plan a week of dinners

You're planning weeknight dinners for a family of four (2 adults, 2 growing 11-year-olds). They shop on Instacart on
Sunday morning, prep on Sunday evening, and cook in 15–30 minutes each weeknight. The result is one markdown file,
`YYYY/Month/YYYY-MM-DD.md`, that the family's app and other agents read.

## 1. Confirm the request

Use these defaults unless the person said otherwise. Ask only about things that would change the plan.

| Question | Default |
|---|---|
| Which week? | The next Monday (the context below names it and its file path). |
| Which nights? | Monday–Friday. A night off is fine: "Friday: Pizza night". |
| Who cooks each night? | Leave it out if you weren't told. |
| Special requests? | None, e.g. "use up the salmon", "one new recipe", "kids want tacos". |

## 2. Get the context

Always read [`reference/planning.md`](../../reference/planning.md), which has the family's rules. Then get the recipe
list with last-cooked dates, using the first option that works for you:

1. **You can run commands (Node 22.18+):** `cd app && npm ci && npm run plan -- context`
2. **You can fetch web pages:** https://seanhorgan.github.io/recipes/agent-context.md. It's regenerated on every
   push to `main`; the "Generated" line gives its date.
3. **You can only read repo files:** read the header of each file in `recipes/`, and the last 4 plan files in the
   `YYYY/Month/` folders. A recipe's "last cooked" date is the latest plan that lists it. Recipes don't store it.

## 3. Choose the dinners

**Must:**
- Gluten-free: `gluten_free: yes`, or `swap` with the gluten-free swap applied.
- No red meat or pork, and no mushrooms (Will dislikes them).
- `weeknight_minutes` of 30 or less.
- Nothing cooked in the last 4 weeks (marked `⚠ recent` in the context).
- No key ingredient twice in the week, and no dish style (`tags`) twice (see "Meal Variety" in `planning.md`).

**Should:**
- A protein mix of about 2 fish/shellfish, 2 plant, and at most 1 poultry or egg. Poultry is fine occasionally;
  fish is preferred.
- Seafood early in the week (Monday–Wednesday), since the groceries arrive on Sunday.
- At least one favorite (★★★★ or more), and at most one or two recipes the family hasn't had before.
- A total Sunday prep (the sum of `prep_minutes`) of about 2 hours or less.
- Enough protein for the kids. If a dinner is light, add a note under that day, e.g. `Kid boost: side of edamame.`

**A dish that isn't in the repo yet?** Add it first with the [add-recipe skill](../add-recipe/SKILL.md), then plan it.
Don't change existing recipes while planning unless you're asked to.

## 4. Write the plan

**If you can run commands:**
```sh
cd app
npm run plan -- new 2026-10-05 mon=lemon-dill-salmon-asparagus:Ali tue=red-lentil-coconut-dal "fri=Pizza night"
```
- Each `day=<slug>` uses the recipe's file name without `.md`; `:Name` sets the cook.
- The command writes the plan with its Sunday Prep checklist and shopping list, then prints a variety check and any
  problems.
- If there are variety warnings, swap dinners and run it again with `--force`.
- After editing a plan by hand, run `npm run plan -- fill 2026-10-05` to rebuild the two lists. Checked items stay checked.

**If you can only edit files:** copy [`reference/templates/plan.md`](../../reference/templates/plan.md) and follow
[`reference/schema.md`](../../reference/schema.md):
- Name the file for the week's Monday, in that Monday's month folder, e.g. `2026/October/2026-10-05.md`.
- One heading per night: `## Monday: [Recipe Title](../../recipes/<slug>.md)`, with `Cook: Name` under it if known.
- `## Sunday Prep`: each recipe's `## Sunday Prep` steps as `- [ ] <step> (<Recipe Title>)`, in dinner order.
  Merge identical steps (such as "Cook the quinoa") into one line naming both recipes. Add
  `- [ ] Make the <Sauce> (for <Recipe>)` for each linked sauce.
- `## Shopping List`: follow [`reference/shopping.md`](../../reference/shopping.md). Include linked sauces' ingredients
  and merge duplicates, adding up the quantities. Group under `### Aisle` headings in the aisle order of
  [`reference/ingredients.md`](../../reference/ingredients.md), and use its "Buy as" text. Leave pantry staples off
  the list, and end with `*Check the pantry: ...*`.

## 5. Validate

- **If you can run commands:** `cd app && npm run validate` must report 0 errors.
- **Otherwise:** the "Validate recipes" GitHub Action runs on every push. Check its result, and fix anything it reports.

## 6. Commit and report back

- Commit with the message `Plan week of <Month D, YYYY>`. Commit to `main` unless you were asked to open a pull request.
- The app shows the plan about a minute later at `https://seanhorgan.github.io/recipes/#/plans/<YYYY-MM-DD>`.
- Reply with a short summary:
  - Each night's dinner, protein, and weeknight time.
  - The total Sunday prep time.
  - Any variety trade-offs you made.
  - Anything the family needs to decide.
  - The link to the plan.

## Don't
- Invent ratings, or write cook dates into recipes (the plans are the record).
- Remove or rewrite past weeks' plans.
- Put secrets or tokens in any file. The repo is public.
