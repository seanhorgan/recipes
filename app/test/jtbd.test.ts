import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDayNote, updateChecklistItem, parsePlan } from '../src/lib/plan.ts';
import { addRating, parseRecipe } from '../src/lib/recipe.ts';
import { searchRecipes, searchTerms } from '../src/lib/search.ts';

const PLAN = `# Week of October 5, 2026

## Monday: [Bowls](../../recipes/bowls.md)
Cook: Ali

## Tuesday: Leftovers

## Sunday Prep
- [ ] Cook the quinoa. (Bowls)
`;

test('claiming a prep step, and unclaiming it', () => {
  const claimed = updateChecklistItem(PLAN, 'Sunday Prep', 'Cook the quinoa. (Bowls)', { claimedBy: 'Sean' });
  assert.match(claimed, /- \[ \] Cook the quinoa\. \(Bowls\) — Sean/);
  const done = updateChecklistItem(claimed, 'Sunday Prep', 'Cook the quinoa. (Bowls)', { done: true });
  assert.match(done, /- \[x\] Cook the quinoa\. \(Bowls\) — Sean/);
  assert.match(updateChecklistItem(done, 'Sunday Prep', 'Cook the quinoa. (Bowls)', { claimedBy: null }), /- \[x\] Cook the quinoa\. \(Bowls\)\n/);
});

test('adding a note to a night keeps the plan valid and is idempotent', () => {
  const once = addDayNote(PLAN, 'Monday', 'Swap: chicken thighs instead of cod (out of cod)');
  assert.match(once, /## Monday: \[Bowls\]\(\.\.\/\.\.\/recipes\/bowls\.md\)\nCook: Ali\nSwap: chicken thighs instead of cod \(out of cod\)\n\n## Tuesday/);
  assert.equal(addDayNote(once, 'Monday', 'Swap: chicken thighs instead of cod (out of cod)'), once);
  const tue = addDayNote(once, 'Tuesday', 'Use up the rice');
  assert.match(tue, /## Tuesday: Leftovers\nUse up the rice\n/);
  const { plan, issues } = parsePlan('2026/October/2026-10-05.md', tue);
  assert.deepEqual(issues.items, []);
  assert.deepEqual(plan.days[0].notes, ['Swap: chicken thighs instead of cod (out of cod)']);
  assert.equal(addDayNote(PLAN, 'Friday', 'x'), PLAN);
});

const RECIPE = `---
protein: fish
gluten_free: yes
prep_minutes: 0
weeknight_minutes: 20
---
# Lemon Salmon

## Ingredients
- 1.5 lb salmon fillets
- 2 lemons, juiced
- 1 bunch asparagus

## Weeknight
1. Roast.
`;

test('rating a recipe adds a Ratings section, appends, and replaces the same night', () => {
  const first = addRating(RECIPE, { date: '2026-10-05', stars: 4, note: 'Kids loved it' });
  assert.match(first, /## Weeknight\n1\. Roast\.\n\n## Ratings\n- 2026-10-05 ★★★★ Kids loved it\n$/);
  const second = addRating(first, { date: '2026-10-12', stars: 5, note: null });
  assert.match(second, /- 2026-10-05 ★★★★ Kids loved it\n- 2026-10-12 ★★★★★\n$/);
  const redo = addRating(second, { date: '2026-10-05', stars: 3, note: 'A bit dry' });
  assert.match(redo, /- 2026-10-05 ★★★ A bit dry\n- 2026-10-12 ★★★★★\n$/);
  const { recipe, issues } = parseRecipe('recipes/lemon-salmon.md', redo);
  assert.deepEqual(issues.items, []);
  assert.equal(recipe.ratings.length, 2);
});

test('rating a recipe whose Ratings section is followed by nothing else', () => {
  const withNotes = RECIPE + '\n## Notes\n- Good cold.\n\n## Ratings\n- 2026-09-01 ★★\n';
  assert.match(addRating(withNotes, { date: '2026-10-05', stars: 5, note: null }), /## Ratings\n- 2026-09-01 ★★\n- 2026-10-05 ★★★★★\n$/);
});

test('ingredient search: several terms, best matches first, plurals and word starts', () => {
  const r = (title: string, ings: string) => parseRecipe(`recipes/${title.toLowerCase().replace(/\W+/g, '-')}.md`, RECIPE.replace('Lemon Salmon', title).replace(/## Ingredients\n[\s\S]*?\n\n/, `## Ingredients\n${ings}\n\n`)).recipe;
  const recipes = [
    r('Pepper Stir-Fry', '- 2 bell peppers\n- 1 block tofu'),
    r('Salmon Bowls', '- 1 lb salmon\n- 2 cups cooked quinoa'),
    r('Spring Pea Risotto', '- 1 cup frozen peas\n- 1 lemon'),
    r('Lemon Salmon', '- 1.5 lb salmon fillets\n- 2 lemons, juiced'),
  ];
  assert.deepEqual(searchTerms(' Lemons, salmon ,, '), ['lemon', 'salmon']);
  assert.deepEqual(searchRecipes(recipes, 'salmon, lemons').map((x) => [x.recipe.title, x.matched]), [
    ['Lemon Salmon', ['salmon', 'lemon']],
    ['Salmon Bowls', ['salmon']],
    ['Spring Pea Risotto', ['lemon']],
  ]);
  assert.deepEqual(searchRecipes(recipes, 'pea').map((x) => x.recipe.title), ['Spring Pea Risotto']);
  assert.equal(searchRecipes(recipes, '').length, 4);
});
