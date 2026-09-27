import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIngredientLine, parseCatalog, matchIngredient } from '../src/lib/ingredients.ts';
import { parseRecipe, parseRating, currentRating } from '../src/lib/recipe.ts';
import { parsePlan, parseChecklistItem, formatChecklistItem } from '../src/lib/plan.ts';
import { loadRepo, cookHistory } from '../src/lib/repo.ts';
import { planPath, mondayOf } from '../src/lib/dates.ts';
import { resolveLink, relativeLink } from '../src/lib/markdown.ts';

test('ingredient lines', () => {
  const a = parseIngredientLine('1.5 lb salmon fillets, skin on');
  assert.deepEqual([a.quantity, a.unit, a.name, a.note], [{ min: 1.5, max: 1.5 }, 'lb', 'salmon fillets', 'skin on']);

  const b = parseIngredientLine('1 1/2 cups cooked quinoa');
  assert.deepEqual([b.quantity?.min, b.unit, b.name], [1.5, 'cup', 'cooked quinoa']);

  const c = parseIngredientLine('2-4 GF flatbreads');
  assert.deepEqual([c.quantity, c.unit, c.name], [{ min: 2, max: 4 }, null, 'GF flatbreads']);

  const d = parseIngredientLine('1 jar (23 oz) marinara sauce');
  assert.deepEqual([d.unit, d.size, d.name], ['jar', '23 oz', 'marinara sauce']);

  const e = parseIngredientLine('Optional: fresh dill');
  assert.deepEqual([e.optional, e.quantity, e.name], [true, null, 'fresh dill']);

  const f = parseIngredientLine('1 batch [Lemon-Garlic Yogurt Sauce](../sauces/lemon-garlic-yogurt-sauce.md), for drizzling');
  assert.deepEqual(
    [f.unit, f.name, f.link, f.note],
    ['batch', 'Lemon-Garlic Yogurt Sauce', '../sauces/lemon-garlic-yogurt-sauce.md', 'for drizzling'],
  );

  const h = parseIngredientLine('1.5 lb white fish (cod, tilapia, or halibut), cut into chunks');
  assert.deepEqual([h.name, h.note], ['white fish (cod, tilapia, or halibut)', 'cut into chunks']);

  const g = parseIngredientLine('½ cup feta');
  assert.deepEqual([g.quantity?.min, g.unit, g.name], [0.5, 'cup', 'feta']);
});

const CATALOG = `
| Ingredient | Aisle | Kind | Buy as | Also called |
|---|---|---|---|---|
| Sweet potato | Produce | key | | yam |
| Olive oil | Pantry | staple | | extra virgin olive oil |
| Cauliflower | Produce | key | 2 lb family pack of florets | cauliflower florets |
`;

test('catalog parsing and matching', () => {
  const { catalog, issues } = parseCatalog(CATALOG);
  assert.equal(issues.items.length, 0);
  assert.equal(matchIngredient(catalog, 'large sweet potatoes')?.name, 'Sweet potato');
  assert.equal(matchIngredient(catalog, 'Extra-virgin olive oil')?.name, 'Olive oil');
  assert.equal(matchIngredient(catalog, 'Cauliflower florets')?.buyAs, '2 lb family pack of florets');
  assert.equal(matchIngredient(catalog, 'kale'), undefined);
  assert.equal(matchIngredient(catalog, 'yam or cauliflower')?.name, 'Sweet potato');

  const bad = parseCatalog('| Ingredient | Aisle |\n|---|---|\n| Kale | Veg |');
  assert.match(bad.issues.items[0].message, /unknown aisle/);
});

const RECIPE = `---
protein: fish
gluten_free: yes
prep_minutes: 10
weeknight_minutes: 20
tags: [sheet-pan]
---
# Lemon-Dill Salmon

*Bright and fast.*

## Ingredients
- 1.5 lb salmon fillets
### Sauce
- 1 lemon, juiced

## Sunday Prep
1. Halve potatoes.

## Weeknight
1. Roast
   for 15 min.
2. Serve.

## Ratings
- 2026-03-23 ★★★
- 2026-05-12 ⭐️⭐️⭐️⭐️ Kids loved it
`;

test('recipe parsing', () => {
  const { recipe, issues } = parseRecipe('recipes/lemon-dill-salmon.md', RECIPE);
  assert.deepEqual(issues.items, []);
  assert.equal(recipe.title, 'Lemon-Dill Salmon');
  assert.equal(recipe.description, 'Bright and fast.');
  assert.equal(recipe.protein, 'fish');
  assert.equal(recipe.glutenFree, 'yes');
  assert.deepEqual(recipe.tags, ['sheet-pan']);
  assert.equal(recipe.ingredients[1].group, 'Sauce');
  assert.deepEqual(recipe.weeknight.map((s) => s.text), ['Roast for 15 min.', 'Serve.']);
  assert.deepEqual(currentRating(recipe), { date: '2026-05-12', stars: 4, note: 'Kids loved it', line: 27 });
});

test('recipe errors', () => {
  const { issues } = parseRecipe('recipes/Bad Name.md', '# X\n\n## Directions\nStuff\n\n## History\n- 2026-01-01\n');
  const messages = issues.items.filter((i) => i.level === 'error').map((i) => i.message).join('\n');
  assert.match(messages, /kebab-case/);
  assert.match(messages, /Missing the --- header/);
  assert.match(messages, /Split "## Directions"/);
  assert.match(messages, /"## History" is replaced/);
  assert.match(messages, /Missing "## Ingredients"/);
});

test('ratings', () => {
  assert.deepEqual(parseRating('2026-05-12 ★★★★★ — Easy to make', 3), { date: '2026-05-12', stars: 5, note: 'Easy to make', line: 3 });
  assert.equal(parseRating('great!', 1), null);
});

const PLAN = `# Week of September 7, 2026

## Monday: [Lemon-Dill Salmon](../../recipes/lemon-dill-salmon.md)
Cook: Ali
Double the sauce.

## Wednesday: Leftovers

## Sunday Prep
- [x] Halve potatoes (Salmon) — Sean
- [ ] Cook quinoa

## Shopping List
### Produce
- [ ] Lemons (2)
### Seafood
- [x] Salmon (1.5 lb) — Ali
`;

test('plan parsing', () => {
  const { plan, issues } = parsePlan('2026/September/2026-09-07.md', PLAN);
  assert.deepEqual(issues.items, []);
  assert.equal(plan.days.length, 2);
  assert.deepEqual(
    [plan.days[0].date, plan.days[0].recipePath, plan.days[0].cook, plan.days[0].notes],
    ['2026-09-07', 'recipes/lemon-dill-salmon.md', 'Ali', ['Double the sauce.']],
  );
  assert.deepEqual([plan.days[1].date, plan.days[1].recipePath, plan.days[1].label], ['2026-09-09', null, 'Leftovers']);
  assert.deepEqual(plan.sundayPrep.map((i) => [i.done, i.claimedBy]), [[true, 'Sean'], [false, null]]);
  assert.deepEqual(plan.shopping.map((g) => [g.aisle, g.items.length]), [['Produce', 1], ['Seafood', 1]]);
});

test('plan path rules', () => {
  assert.match(parsePlan('2026/September/2026-09-08.md', '# W\n').issues.items[0].message, /not a Monday/);
  assert.match(parsePlan('2026/October/2026-09-07.md', '# W\n').issues.items[0].message, /belongs at 2026\/September/);
  assert.equal(planPath('2025-12-29'), '2025/December/2025-12-29.md');
  assert.equal(mondayOf('2026-09-13'), '2026-09-07');
});

test('checklist round trip', () => {
  const item = parseChecklistItem('- [ ] Roast sweet potatoes (Tacos) — Sean', 1)!;
  assert.deepEqual([item.text, item.done, item.claimedBy], ['Roast sweet potatoes (Tacos)', false, 'Sean']);
  assert.equal(formatChecklistItem({ ...item, done: true }), '- [x] Roast sweet potatoes (Tacos) — Sean');
});

test('links', () => {
  assert.equal(resolveLink('2026/May/2026-05-04.md', '../../recipes/x.md'), 'recipes/x.md');
  assert.equal(relativeLink('2026/May/2026-05-04.md', 'recipes/x.md'), '../../recipes/x.md');
  assert.equal(relativeLink('recipes/a.md', 'sauces/b.md'), '../sauces/b.md');
});

test('repo cross-checks and cook history', () => {
  const files = new Map([
    ['reference/ingredients.md', CATALOG + '| Salmon | Seafood | key | | salmon fillet |\n| Lemon | Produce | | | |\n'],
    ['recipes/lemon-dill-salmon.md', RECIPE],
    ['2026/March/2026-03-23.md', '# Week\n\n## Monday: [Salmon](../../recipes/lemon-dill-salmon.md)\n'],
    ['2026/September/2026-09-07.md', PLAN.replace('lemon-dill-salmon', 'missing')],
  ]);
  const repo = loadRepo(files);
  const messages = repo.issues.map((i) => `${i.level} ${i.message}`);
  assert.ok(messages.some((m) => /error Linked recipe recipes\/missing.md does not exist/.test(m)));
  assert.ok(messages.some((m) => /warning Rating date 2026-05-12 is not a night/.test(m)));
  assert.ok(!messages.some((m) => /2026-03-23 is not a night/.test(m)));
  assert.deepEqual(cookHistory(repo.plans).get('recipes/lemon-dill-salmon.md'), ['2026-03-23']);
});
