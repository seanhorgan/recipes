---
name: adjust-plan
description: Change a week's meal plan in the Kleyman-Horgan recipes repo, such as swapping or moving nights, replacing a dinner, skipping a night, or using up ingredients already at home, then rebuild its Sunday Prep and shopping list. Use when asked to change, swap, move, or replan dinners for a week, or to adjust the plan around what's in the fridge.
---

# Adjust a week's plan

The plan is `YYYY/Month/YYYY-MM-DD.md`, named for the week's Monday (see
[`reference/schema.md`](../../reference/schema.md)). Read it and [`reference/planning.md`](../../reference/planning.md)
first.

## 1. Work out the change
- **Swap or move nights:** move the whole day section: the heading, its `Cook:` line, and its notes. Keep seafood
  early in the week where possible.
- **Replace a dinner:** pick a replacement with the [find-recipes skill](../find-recipes/SKILL.md). Follow the same
  rules as [plan-week](../plan-week/SKILL.md): gluten-free, no repeats from the last 4 weeks, and no key ingredient or
  dish style twice.
- **Use what's at home:** search for the ingredients on hand (`npm run plan -- find "chicken, spinach"`). Prefer
  recipes that use the most of them and still fit the rules. On the shopping list, check off (`[x]`) anything the
  family already has.
- **Skip a night:** change the heading to plain text, e.g. `## Thursday: Eating out`.
- **Past nights:** don't change nights that have already happened, except to add a note.
- Add a one-line note under a changed night if the reason matters later, e.g. `Moved from Tuesday (late practice)`.

## 2. Update the file
- **If you can run commands:** edit the day sections, then run:
  - `cd app && npm run plan -- fill <Monday>` to rebuild Sunday Prep and the shopping list. Checked items stay
    checked.
  - `npm run plan -- check <Monday>` to review variety and problems.
- **If you can only edit files:** edit the day sections, then update the lists by hand, as described in
  [plan-week step 4](../plan-week/SKILL.md). Remove prep steps and shopping items that only the removed dinner
  needed, and add the new dinner's. Don't change the text of items you keep; the app matches items by their text.
  If Sunday prep or shopping already happened, add a note listing anything extra to buy or prep.

## 3. Validate, commit, and report
- **Validate:** `cd app && npm run validate` (or check the "Validate recipes" GitHub Action).
- **Commit:** use the message `Adjust plan for week of <Month D, YYYY>: <what changed>`.
- **Report back:** what changed, the new dinners, anything to buy or prep, and any variety trade-offs.
