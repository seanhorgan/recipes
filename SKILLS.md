# Recipe Agent Skills

This document defines the operational protocols for AI agents managing the Kleyman-Horgan Recipe Archive.

## Capabilities

### Meal Planning
- Refer to [protocols/planning.md](protocols/planning.md) for family preferences, variety rules, and growth-stage protein requirements.
- Store weekly plans in `YYYY/Month/YYYY-MM-DD.md`.

### Shopping List Generation
- Refer to [protocols/shopping.md](protocols/shopping.md) for de-duplication, quantity merging, and specific ingredient preferences.

### Maintenance
- **History Tracking:** Append the plan date to the "## History" section of every recipe used.
- **Recipe Entry:** Standardize new recipes with Ingredients, Directions, and Rating sections.

## Repository Structure
- `/recipes`: Individual dish files.
- `/drinks`: Beverage recipes.
- `/2026`: Archive of weekly meal plans.
- `/protocols`: Logic and rules for agents.
