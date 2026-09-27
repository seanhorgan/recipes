---
name: cook-tonight
description: Help cook tonight's planned dinner in the Kleyman-Horgan recipes repo. Shows the weeknight steps, flags Sunday prep that wasn't done, handles ingredient substitutions, and records changes on the plan. Use when asked what's for dinner, how to make tonight's meal, to substitute or swap an ingredient, or to adapt tonight's meal.
---

# Cook tonight's dinner

## 1. Find tonight's dinner
- Open this week's plan, `YYYY/Month/<Monday>.md`, and find today's weekday heading. It links the recipe and may have
  a `Cook:` line and notes, such as swaps already decided.
- If today has no dinner, say so and offer the [find-recipes skill](../find-recipes/SKILL.md).

## 2. Check the prep
In the plan's `## Sunday Prep`, the items for this recipe name it in their `(...)` label. Anything unchecked (`- [ ]`)
has to be done first, so add it to the start of the steps and to the total time.

## 3. Walk through the recipe
- Give the recipe's `## Weeknight` steps, its ingredients, and any `## Kid Boost`.
- Keep it within 15–30 minutes where you can.

## 4. Adjust the meal
- **Substitutions:** suggest ones that keep the family's rules (gluten-free, no mushrooms, fish or plant protein
  preferred, poultry fine) and the kids' protein.
- **Record what changed** as a one-line note under tonight's heading in the plan, e.g.
  `Swap: chicken thighs instead of cod (out of cod)`. Don't edit the recipe for a one-off change.
- **If the family says the change should be permanent**, update the recipe itself (ingredients, steps, or `## Notes`),
  following [add-recipe](../add-recipe/SKILL.md), then validate.
- **Bigger changes** (eating out, swapping nights, a different dinner): use the [adjust-plan skill](../adjust-plan/SKILL.md).

## 5. Afterwards
- **Commit** any note with the message `Tonight (<Day>): <change>`.
- Ask how it went, and record the rating with the [rate-meal skill](../rate-meal/SKILL.md).
- The family can also use the app's **Tonight** screen, which shows the same steps and prep status and lets them add a
  note or a rating.
