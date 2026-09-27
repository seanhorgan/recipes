# Kleyman-Horgan Recipe Archive

Our goal is to make planning family recipes and making easy-prep dinners each week much easier. Our family is 2 adults with 2 kids with busy schedules so we try to do as much meal prep as possible on Sunday evenings so our meals on Monday through Friday are easy to prepare and cook in 15-30 minutes.

This repo tracks recipes by year/month/week to make it easier to repeat recipes we really like while also maintaining some variety by not repeating the same recipes and ingredients over and over again. I want to use this repo as the source of truth for all food recipes and drinks, as well as our food preferences and ratings on the recipes. I will ask different AI agents and develop applications to use this repo to read and write information, so make it easy for these agents & apps to do that.

## Flow
This is our current task flow each week:
* Sunday morning: 1) create recipes for the week, 2) create a shopping list for instacart and submit the order
* Sunday afternoon: get the food from instacart and put everything away
* Sunday evening (7pm): do the weekly food prep and store everything for the recipes
* Each day Monday to Friday (5pm): 15-30 minutes of final prep & cooking before serving dinner. The adult preparing the meals each day varies.

These tasks are usually done by 2 adults so collaboration in each task is important. We share an instacart account so it's easy to work together on the shopping list. 

## Food preferences
* Gluten-free for 1 adult. It's ok to have some gluten in a recipe provided that there is an easy gluten-free option. We're fine with gluten free pasta for everyone.
* Pescatarian for 1 adult. It's ok to occasionally have poultry but we have a preference towards fish as a source of animal protein.
* Everyone enjoys plant protein sources like tofu.
* Kids are growing and need a lot of protein and nutrients in dinners. 
* Avoid too much fat, sugar, processed food.

## For Humans
- **Recipes:** Browse the [`/recipes`](./recipes) folder for dinner ideas.
- **Drinks:** Check [`/drinks`](./drinks) for beverage inspiration.
- **Sauces:** Shared sauces and dressings live in [`/sauces`](./sauces).
- **Weekly Plans:** Current and past meal plans are stored by year and month in the [`/2026`](./2026) (and similar) directories.
- **Editing:** Every file follows [protocols/schema.md](./protocols/schema.md). Copy a template from [`/protocols/templates`](./protocols/templates) to add a recipe or plan.
- **App:** Open [seanhorgan.github.io/recipes](https://seanhorgan.github.io/recipes/) on your phone. The code lives in [`/app`](./app) (see [app/PLAN.md](./app/PLAN.md)).

## For Agents
AI agents managing this repository should begin by reading [SKILLS.md](./SKILLS.md). To plan a week, follow [skills/plan-week](./skills/plan-week/SKILL.md); to add recipes, follow [skills/add-recipe](./skills/add-recipe/SKILL.md).
