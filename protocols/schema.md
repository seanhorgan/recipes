# File Formats

Every file in this repo is plain markdown that people can edit by hand on GitHub. Apps and agents read the same files, so
they follow a few fixed conventions. Each fact lives in exactly one place:

| Fact | Where it lives |
|---|---|
| How to make a dish | `recipes/<slug>.md` |
| A shared sauce or dressing | `sauces/<slug>.md` |
| What we cook each week, and who cooks it | `YYYY/Month/YYYY-MM-DD.md` (weekly plans) |
| When a dish was last cooked | Derived from the weekly plans (not stored in recipes) |
| How the family rated a dish | The recipe's `## Ratings` section |
| Aisle, how to buy it, pantry staple | `protocols/ingredients.md` |

Templates: [`protocols/templates/recipe.md`](templates/recipe.md) and [`protocols/templates/plan.md`](templates/plan.md).

Check your changes with the validator (it also runs automatically on every push):

```sh
cd app && npm install && npm run validate
```

Errors must be fixed. Warnings are hints (for example, an ingredient missing from the catalog).

---

## Recipes (`recipes/<slug>.md`)

The file name is the title in lowercase kebab-case, e.g. `lemon-dill-salmon-asparagus.md`.

```markdown
---
protein: fish
gluten_free: yes
prep_minutes: 20
weeknight_minutes: 20
tags: [sheet-pan]
---
# Lemon-Dill Salmon & Asparagus

*Optional one-line description.*

## Ingredients
- 1.5 lb salmon fillets
- 1 lb fingerling potatoes, halved
- 1 batch [Lemon-Garlic Yogurt Sauce](../sauces/lemon-garlic-yogurt-sauce.md)
- fresh dill
- Optional: 2 oz feta

## Sunday Prep
1. Halve the potatoes; store covered in water in the fridge.

## Weeknight
1. Roast potatoes at 400°F for 15 min.
2. ...

## Kid Boost
- Side of edamame.

## Notes
- Chicken option: ...

## Ratings
- 2026-05-12 ★★★★ Kids asked for seconds
```

### Header (between the `---` lines)
| Field | Required | Values |
|---|---|---|
| `protein` | yes | Main protein: `fish`, `shellfish`, `poultry`, `plant`, or `egg` |
| `gluten_free` | yes | `yes` (as written), or `swap` (needs an easy GF swap, described in `## Notes`) |
| `prep_minutes` | yes | Sunday prep time in minutes (`0` if none) |
| `weeknight_minutes` | yes | Total time on the night, from starting to serving |
| `tags` | no | Dish style, from: `bowl`, `sheet-pan`, `skillet`, `soup`, `pasta`, `tacos`, `flatbread`, `salad`, `stir-fry`, `baked` |

### Sections, in this order
| Section | Required | Content |
|---|---|---|
| `# Title` | yes | The dish name |
| `*description*` | no | One italic line right under the title |
| `## Ingredients` | yes | One bullet per ingredient (see below). `### Subheadings` such as `### Sauce` are allowed. |
| `## Sunday Prep` | no | Numbered steps done on Sunday evening. Leave the section out if there's nothing to prep. |
| `## Weeknight` | yes | Numbered steps done at 5pm on the night |
| `## Kid Boost` | no | Bullets: extra protein or nutrients for the kids |
| `## Notes` | no | Bullets: swaps, variations, storage |
| `## Ratings` | no | One bullet per rating (see below) |

### Ingredient lines
`- [quantity] [unit] name[, note]`

- **Quantity:** `1`, `1.5`, `1/2`, `1 1/2`, or a range like `2-4`. Leave it out for things like `fresh dill`.
- **Unit:** one of `tsp`, `tbsp`, `cup`, `oz`, `lb`, `g`, `ml`, `quart`, `can`, `jar`, `bag`, `box`, `bunch`,
  `head`, `clove`, `block`, `pack`, `package`, `tube`, `loaf`, `link`, `fillet`, `handful`, `packet`, `pinch`, `batch`, or `carton`
  (plurals are fine). Leave it out for counts: `2 avocados`.
- **Note:** everything after the first comma: `2 cans chickpeas, rinsed`.
- **Optional ingredients** start with `Optional:`.
- **Sauces** are a link to a file in `sauces/`. The shopping list and Sunday prep include the sauce's ingredients and steps.
- Write "juice of 1 lemon" as `1 lemon, juiced`.

Each ingredient name should match a row (or alias) in [`protocols/ingredients.md`](ingredients.md). That's how the
shopping list knows the aisle and merges duplicates.

### Ratings
`- YYYY-MM-DD ★★★★ optional note`

- One line per time the family rated the dish, dated the night it was cooked. Use 1–5 `★` (`⭐` also works).
- The recipe's rating is the most recent line.
- There is one family rating, not one per person.

---

## Sauces (`sauces/<slug>.md`)

These use the same format as recipes, but the header only needs `prep_minutes`. Use `## Directions` instead of
`## Sunday Prep` and `## Weeknight`. Recipes that use a sauce link to it from their ingredients.

---

## Weekly plans (`YYYY/Month/YYYY-MM-DD.md`)

- **Name:** the file is named for the **Monday** of the week and stored in that Monday's month folder,
  e.g. `2026/September/2026-09-07.md`.
- **Days:** list any subset of days, in order, Monday to Sunday.

```markdown
# Week of September 7, 2026

## Monday: [Crispy Sesame-Ginger Tofu Stir-Fry](../../recipes/sesame-ginger-tofu-stir-fry.md)
Cook: Ali

## Tuesday: Leftovers

## Sunday Prep
- [ ] Press and cube tofu (Tofu Stir-Fry) — Sean
- [x] Cook quinoa (Taco Bowls)

## Shopping List
### Produce
- [ ] Asparagus (2 bunches)
```

- **Day headings:** `## <Day>: [Recipe title](../../recipes/<slug>.md)`, or plain text for a night off (`## Friday: Pizza night`).
- **Cook line:** `Cook: <name>` under a day assigns who cooks that night. Any other lines under a day are free-form notes.
- **Checklists:** `## Sunday Prep` and `## Shopping List` are shared. `[x]` means done. An optional `— Name` at the end
  says who has claimed the item. Shopping items are grouped under `### Aisle` headings.
- **Last cooked:** the date a dish was "last cooked" is worked out from these files, so a recipe's history never needs to be
  written by hand.
