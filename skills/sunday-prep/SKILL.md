---
name: sunday-prep
description: Run the Sunday evening meal prep for the Kleyman-Horgan family. Turns the week's Sunday Prep checklist into an efficient order (oven, stovetop, and chopping in parallel), splits it between two adults, and checks items off in the plan. Use when asked to help with Sunday prep, what to prep, a prep schedule, or to mark prep done.
---

# Sunday prep

The week's plan is `YYYY/Month/YYYY-MM-DD.md`, named for the Monday after this Sunday. Its `## Sunday Prep` section is
the shared checklist. Each item ends with the recipes it's for, e.g. `Cook the quinoa. Refrigerate. (Bowls, Tacos)`.
Each recipe's own `## Sunday Prep` has the detail.

## 1. Check the list exists
If the plan has no `## Sunday Prep`, build it:
- **If you can run commands:** `cd app && npm run plan -- fill <Monday>`.
- **Otherwise:** build it by hand as described in [plan-week step 4](../plan-week/SKILL.md).

## 2. Make a schedule
Put the steps in an order that finishes fastest:
1. Start the longest hands-off jobs first: oven roasting (group trays by temperature, usually 400°F), grains
   (quinoa ~15 min, sorghum ~50 min), and boiling potatoes.
2. Chop, press tofu, and trim vegetables while those cook.
3. Make sauces and dressings last, then cool and store everything. Label containers with the night they're for.

If two adults are prepping, split the steps so each keeps the oven or stove busy. Give a rough total time: the sum of
the week's recipes' `prep_minutes`, less what runs in parallel.

## 3. Record progress in the plan
- **Done:** change `- [ ]` to `- [x]`.
- **Claimed:** add ` — Name` to the end of the line, e.g. `- [ ] Cook the quinoa. (Bowls) — Sean`.
- Never reword an item; the app and other agents match items by their exact text.
- The family can also check items off and claim them in the app, on the week's plan page.
- **Commit:** use the message `Sunday prep: <what changed>`.
