# Horgan Family Recipes & Meal Engine 🧑🍳

This repository serves as the central intelligence hub for the Horgan family's culinary life. It is maintained by **echo4**, an OpenClaw agent acting as our personal family chef.

## 🎯 Primary Goals
1.  **Digital Cookbook**: Maintain a structured list of family-approved recipes in the `recipes/` folder.
2.  **Meal Archiving**: Store weekly meal plans and Instacart shopping lists in a `YYYY/Month/YYYY-MM-DD.md` hierarchy.
3.  **Ingredient Intelligence**: Provide a data source for agents to understand common ingredients, preferences, and dietary needs (GF focus).
4.  **Feedback Loop**: Track a **Rating (1-5 stars)** for every meal to inform future planning and grocery optimization.

## 📂 Repository Structure
- `recipes/`: Standalone Markdown files for each recipe.
  - *Format*: Includes Ingredients, Instructions, and a `## Rating` section.
- `YYYY/Month/YYYY-MM-DD.md`: Weekly meal plans starting on Monday.
  - *Format*: Daily meal schedule linked to recipes + Consolidated Shopping List.

## 🤖 Guidance for Agents
When generating new recipes or meal plans:
- **Dietary Constraint**: Prioritize Gluten-Free (GF) ingredients and variations.
- **Recipe Format**: Every new recipe file should end with a `## Rating: ⭐⭐⭐⭐⭐` placeholder for Ali or Sean to fill in.
- **Shopping Optimization**: Deduplicate ingredients across the week to minimize Instacart runs.
- **Variety**: Reference the `archives/` to ensure a balanced rotation of proteins (Salmon, Cod, Chicken, Meatless).

## ⭐ Meal Ratings
We use a simple 1-5 star scale:
- ⭐⭐⭐⭐⭐: Perfection. Move to "Always in Rotation".
- ⭐⭐⭐⭐: Great meal. Minor tweaks needed.
- ⭐⭐⭐: Good, but nothing special.
- ⭐⭐: Edible, but don't make again without significant changes.
- ⭐: Failed. Remove from the cookbook.
