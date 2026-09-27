# Meal Planning App — Plan

A mobile-friendly web app for the Kleyman-Horgan family's weekly meal planning, built on top of this repo.
The markdown files in this repo stay the single source of truth; the app only reads and writes them.

Live at https://seanhorgan.github.io/recipes/ (deployed by `.github/workflows/pages.yml` on every push to `main`).

Developing: `npm install`, then `npm run dev` (local site), `npm test` (parser tests), `npm run typecheck`, and
`npm run validate` (checks every recipe, sauce, plan, and the ingredient catalog against `reference/schema.md`).
Needs Node 22.18 or newer.

## Goals
1. **Variety** — make it easy to avoid repeating the same recipes, proteins, and key ingredients.
2. **Collaboration** — two adults share Sunday planning, shopping, Sunday prep, and weeknight cooking.

## Decisions
| Topic | Decision |
|---|---|
| Hosting | GitHub Pages, static site built from `app/`. |
| Stack | Vite + React + TypeScript. One shared markdown parser used by both the app and the validator. |
| Reads | The repo's markdown is bundled into the site at build time, and the site rebuilds on every push to `main` (about a minute). Connected devices also load the live files from the GitHub API (GraphQL) on open, every 45 seconds while visible, and when the app comes back to the foreground. |
| Writes | A fine-grained GitHub token (this repo only, Contents read/write) entered once per device in Settings. Never committed to the repo. Real GitHub sign-in may replace it later. |
| Shared state | Lives in the weekly plan file as markdown checkboxes and `Cook:` lines. Edits are re-applicable transforms (`src/lib/writeQueue.ts`): taps within 1.5 seconds share one commit, and if the file changed on GitHub in the meantime the app re-reads it and re-applies the edits, so neither adult's changes are lost. |
| Ratings | One family rating per cook, recorded in each recipe's `## Ratings`. The recipe's rating is the most recent one. |
| Cook history | Derived from the weekly plans only; recipes don't store cook dates, so nothing has to be kept in sync. |
| Recipe suggestions | Done by AI agents in chat sessions, not in the app. |
| Drinks | Out of scope for now. |

## Data format (Phase 0 defines it in full in `reference/schema.md`)
- **Recipes** (`recipes/*.md`): a small YAML header (`protein`, `gluten_free`, `prep_minutes`, `weeknight_minutes`, `tags`), then
  `## Ingredients` (`- qty unit name, note`), `## Sunday Prep`, `## Weeknight`, `## Kid Boost`, `## Notes`, `## Ratings`.
  No fact is stored twice.
- **Sauces** (`sauces/*.md`): shared sauces, linked from recipe ingredients so the shopping list and Sunday prep include them.
- **Ingredient catalog** (`reference/ingredients.md`): name, aisle, how to buy, pantry-staple flag. Drives shopping-list
  grouping, merging, and variety checks.
- **Weekly plans** (`YYYY/Month/YYYY-MM-DD.md`, named by the week's Monday): one `## <Day>: [Recipe](link)` section per
  dinner with a `Cook:` line, then `## Sunday Prep` and `## Shopping List` checklists. Any subset of days is allowed.

## Features (v1)
- **Recipe library** — filter by protein, GF, weeknight time, rating, and last cooked. Shows the 8-week cook count.
- **Week planner** — pick dinners, assign cooks, and get variety warnings (repeated key ingredients, protein imbalance, recently cooked).
- **Shopping list** — consolidated per `reference/shopping.md`, grouped by aisle, shared checkboxes, and "copy for Instacart".
- **Sunday prep** — a combined, ordered checklist of every recipe's `## Sunday Prep`, where adults can claim tasks.
- **Tonight** — the weeknight steps for today's dinner, in large text, with the screen kept awake.
- **Rate** — a quick star rating and note after dinner, appended to the recipe's `## Ratings`.

## Phases
0. **Data foundation** (done):
   - Schema doc, recipe template, validator (run on every push), and ingredient catalog.
   - Migrate all recipes and plans to the new format.
   - Import the new recipes from the Google Doc, and add their September plan as `2026/September/2026-09-07.md`.
   - Add an import guide (now `skills/add-recipe`), fix the poultry rule in `reference/planning.md`, and update `SKILLS.md`.
1. **Read-only app** (done): this week's plan, recipe library with filters and "longest since cooked" sorting,
   recipe and sauce pages, past plans with a variety check, and "due for a comeback" suggestions. Deployed to GitHub Pages.
2. **Planning** (done):
   - Settings: connect a device with a fine-grained token and choose who's using it (Ali or Sean).
   - Live sync with a status badge; saving with batched commits and conflict handling.
   - Week planner: pick each night's dinner from a list sorted by longest since cooked (recent dishes flagged), assign
     cooks, add weekend nights or a night off, and see a live variety check, Sunday prep time, and shopping list size.
     Saving writes the plan with its Sunday Prep and Shopping List; editing keeps checked items.
   - Sunday Prep and Shopping List checkboxes on the plan page save for everyone; "Copy for Instacart".
   - The built site has a Content Security Policy (own scripts only; network only to api.github.com).
3. **The week itself**: Sunday prep, Tonight, and ratings.
