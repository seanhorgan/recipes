import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlanLink, planLink, slugForTitle } from '../src/lib/planLink.ts';
import { parseRecipe } from '../src/lib/recipe.ts';

const RECIPE = `---\nprotein: fish\ngluten_free: yes\nprep_minutes: 0\nweeknight_minutes: 20\n---\n# Lemon-Dill Salmon & Asparagus\n\n## Ingredients\n- 1 lb salmon\n\n## Weeknight\n1. Roast.\n`;
const recipes = new Map([['recipes/lemon-dill-salmon-asparagus.md', parseRecipe('recipes/lemon-dill-salmon-asparagus.md', RECIPE).recipe]]);

test('planner links: recipes, cooks, plain nights, notes, and missing recipes', () => {
  const draft = parsePlanLink('mon=lemon-dill-salmon-asparagus:Ali&mon.note=Kid%20boost%3A%20edamame&wed=miso-glazed-cod&fri=Pizza%20night&sat=Leftovers:Sean', recipes)!;
  assert.deepEqual(draft.days, [
    { day: 0, recipePath: 'recipes/lemon-dill-salmon-asparagus.md', label: '', cook: 'Ali', notes: ['Kid boost: edamame'] },
    { day: 2, recipePath: null, label: '', cook: null, notes: [] },
    { day: 4, recipePath: null, label: 'Pizza night', cook: null, notes: [] },
    { day: 5, recipePath: null, label: 'Leftovers', cook: 'Sean', notes: [] },
  ]);
  assert.equal(draft.problems.length, 1);
  assert.match(draft.problems[0], /"miso-glazed-cod" isn't in the recipe box yet/);
  assert.equal(parsePlanLink('', recipes), null);
  assert.equal(parsePlanLink('foo=bar', recipes), null);
});

test('planLink builds links that parse back', () => {
  const url = planLink('2026-10-05', [
    { day: 0, slug: 'lemon-dill-salmon-asparagus', cook: 'Ali', notes: ['Kid boost: edamame'] },
    { day: 4, label: 'Pizza night' },
  ]);
  assert.equal(url, 'https://seanhorgan.github.io/recipes/#/plan/2026-10-05?mon=lemon-dill-salmon-asparagus%3AAli&mon.note=Kid%20boost%3A%20edamame&fri=Pizza%20night');
  const draft = parsePlanLink(url.split('?')[1], recipes)!;
  assert.deepEqual(draft.days.map((d) => [d.day, d.recipePath, d.label, d.cook, d.notes]), [
    [0, 'recipes/lemon-dill-salmon-asparagus.md', '', 'Ali', ['Kid boost: edamame']],
    [4, null, 'Pizza night', null, []],
  ]);
});

test('recipe file names come from titles', () => {
  assert.equal(slugForTitle('Miso-Glazed Cod & Bok Choy'), 'miso-glazed-cod-bok-choy');
  assert.equal(slugForTitle('Spring Pea Quinoa "Risotto"'), 'spring-pea-quinoa-risotto');
});

import { prepareRecipe, keepRatings, cleanPastedMarkdown } from '../src/lib/importRecipe.ts';

const CATALOG = `| Ingredient | Aisle | Kind | Buy as | Also called |
|---|---|---|---|---|
| Cod | Seafood | key | | cod fillets |
| Bok choy | Produce | | | |
`;
const NEW = `\`\`\`markdown
---
protein: fish
gluten_free: yes
prep_minutes: 10
weeknight_minutes: 20
tags: [sheet-pan]
---
# Miso-Glazed Cod & Bok Choy

## Ingredients
- 1.5 lb cod fillets
- 4 heads bok choy, halved
- 2 tbsp white miso

## Sunday Prep
1. Halve the bok choy.

## Weeknight
1. Roast at 425°F for 12 mins.
\`\`\``;

test('a pasted recipe is cleaned, named from its title, and checked like the validator', () => {
  const files = new Map([['reference/ingredients.md', CATALOG]]);
  const p = prepareRecipe(NEW.replace(/\n/g, '\r\n'), files)!;
  assert.equal(p.path, 'recipes/miso-glazed-cod-bok-choy.md');
  assert.equal(p.replacing, false);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.warnings, ['Line 13: "white miso" is new to the ingredient list, so it will go under "Other" on the shopping list']);
  assert.ok(p.text.startsWith('---\nprotein: fish'));
  assert.ok(p.text.endsWith('Roast at 425°F for 12 mins.\n'));

  const broken = prepareRecipe('# Just a title\n\nSome text\n', files)!;
  assert.ok(broken.errors.some((e) => /Missing the --- header/.test(e)));
  assert.ok(broken.errors.some((e) => /Missing "## Weeknight"/.test(e)));
  assert.equal(prepareRecipe('   ', files), null);
});

test('replacing a recipe is detected and keeps its ratings', () => {
  const old = cleanPastedMarkdown(NEW) + '\n## Ratings\n- 2026-09-29 ★★★★ Loved it\n';
  const files = new Map([['reference/ingredients.md', CATALOG], ['recipes/miso-glazed-cod-bok-choy.md', old]]);
  const p = prepareRecipe(NEW.replace('2 tbsp white miso', '3 tbsp white miso'), files)!;
  assert.equal(p.replacing, true);
  const saved = keepRatings(p.text, old);
  assert.match(saved, /3 tbsp white miso/);
  assert.match(saved, /## Ratings\n- 2026-09-29 ★★★★ Loved it\n$/);
  assert.equal(keepRatings(p.text, null), p.text);
});
