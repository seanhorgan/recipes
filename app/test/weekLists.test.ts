import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRepo } from '../src/lib/repo.ts';
import { buildPlanText, buildWeekLists, swapDraftDays, writeWeekLists, type DraftDay } from '../src/lib/weekLists.ts';
import { agentContext } from '../src/lib/agentContext.ts';
import { parsePlan, prepStepKey } from '../src/lib/plan.ts';

const CATALOG = `| Ingredient | Aisle | Kind | Buy as | Also called |
|---|---|---|---|---|
| Quinoa | Grains & Pasta | | | cooked quinoa |
| Cauliflower | Produce | key | 2 lb family pack | cauliflower florets |
| Lemon | Produce | | | lemon juice |
| Greek yogurt | Dairy & Eggs | | | |
| Olive oil | Pantry | staple | | |
| Salmon | Seafood | key | | |
`;

const recipe = (title: string, ingredients: string, prep: string) =>
  `---\nprotein: plant\ngluten_free: yes\nprep_minutes: 10\nweeknight_minutes: 20\n---\n# ${title}\n\n## Ingredients\n${ingredients}\n\n## Sunday Prep\n${prep}\n\n## Weeknight\n1. Cook.\n`;

const files = () =>
  new Map([
    ['reference/ingredients.md', CATALOG],
    ['sauces/yogurt.md', '---\nprep_minutes: 5\n---\n# Yogurt Sauce\n\n## Ingredients\n- 1/2 cup Greek yogurt\n- 1 lemon, juiced\n\n## Directions\n1. Stir.\n'],
    ['recipes/a.md', recipe('Bowls', '- 2 cups cooked quinoa\n- 1 lb cauliflower florets\n- 2 batches [Yogurt Sauce](../sauces/yogurt.md)\n- olive oil', '1. Cook the quinoa.\n2. Roast the cauliflower.')],
    ['recipes/b.md', recipe('Salmon', '- 1.5 lb salmon\n- 1 cup quinoa\n- 1 lemon\n- 1 head cauliflower\n- Optional: 1 cup Greek yogurt', '1. Cook the quinoa.')],
    ['2026/October/2026-10-05.md', '# Week of October 5, 2026\n\n## Monday: [Bowls](../../recipes/a.md)\nCook: Ali\n\n## Tuesday: [Salmon](../../recipes/b.md)\n\n## Shopping List\n### Produce\n- [x] Lemon (3) — Sean\n'],
  ]);

test('week lists merge quantities, expand sauces, and skip staples and optional items', () => {
  const repo = loadRepo(files());
  const plan = repo.plans[0];
  const lists = buildWeekLists(plan, repo.recipes, repo.sauces, repo.catalog);
  assert.deepEqual(lists.sundayPrep, [
    'Cook the quinoa. (Bowls, Salmon)',
    'Roast the cauliflower. (Bowls)',
    'Make 2 batches of the Yogurt Sauce, each: 1/2 cup Greek yogurt; 1 lemon, juiced (for Bowls)',
  ]);
  assert.deepEqual(lists.shopping, [
    { aisle: 'Produce', items: ['Cauliflower (1 lb + 1 head) · 2 lb family pack', 'Lemon (3)'] },
    { aisle: 'Seafood', items: ['Salmon (1½ lb)'] },
    { aisle: 'Dairy & Eggs', items: ['Greek yogurt (1 cup)'] },
    { aisle: 'Grains & Pasta', items: ['Quinoa (3 cups)'] },
  ]);
  assert.deepEqual(lists.pantry, ['Olive oil']);
});

test('writing lists keeps the days and preserves checked items', () => {
  const repo = loadRepo(files());
  const text = files().get('2026/October/2026-10-05.md')!;
  const out = writeWeekLists(text, buildWeekLists(repo.plans[0], repo.recipes, repo.sauces, repo.catalog));
  assert.match(out, /## Monday: \[Bowls\]\(\.\.\/\.\.\/recipes\/a\.md\)\nCook: Ali/);
  assert.match(out, /- \[x\] Lemon \(3\) — Sean/);
  assert.match(out, /- \[ \] Cook the quinoa\. \(Bowls, Salmon\)/);
  assert.equal(out.match(/## Shopping List/g)!.length, 1);
  const again = loadRepo(new Map([...files(), ['2026/October/2026-10-05.md', out]]));
  assert.deepEqual(again.issues.filter((i) => i.level === 'error'), []);
});

test('agent context names the next week and lists recipes', () => {
  const ctx = agentContext(loadRepo(files()), '2026-10-04');
  assert.match(ctx, /week of October 5, 2026 → `2026\/October\/2026-10-05.md` \(a plan already exists/);
  assert.match(ctx, /\| Bowls \| a \| plant \|/);
  assert.match(agentContext(loadRepo(files()), '2026-10-07'), /week of October 12, 2026/);
  assert.doesNotMatch(ctx, /## Instacart products/);
});

test('agent context lists the usual Instacart product for each ingredient that has one', () => {
  const catalog = '| Ingredient | Aisle | Kind | Instacart product |\n|---|---|---|---|\n' +
    '| Salmon | Seafood | key | Wegmans Fresh EU Organic Salmon Fillet |\n| Olive oil | Pantry | staple | Wegmans EVOO |\n| Lemon | Produce | | |\n';
  const ctx = agentContext(loadRepo(new Map([...files(), ['reference/ingredients.md', catalog]])), '2026-10-04');
  assert.match(ctx, /## Instacart products[\s\S]*- Salmon: Wegmans Fresh EU Organic Salmon Fillet\n- Olive oil: Wegmans EVOO \(staple\)/);
  assert.doesNotMatch(ctx, /- Lemon:/);
});

test('prep steps that differ only by storage notes, case, or punctuation count as the same', () => {
  assert.equal(prepStepKey('Cook the quinoa. Refrigerate.'), prepStepKey('cook the quinoa'));
  assert.equal(prepStepKey('Cook the quinoa. (Bowls, Salmon)', true), prepStepKey('Cook the quinoa. Refrigerate. (Tacos)', true));
  assert.notEqual(prepStepKey('Cook the quinoa.'), prepStepKey('Cook the sorghum.'));
  assert.equal(prepStepKey('Boil the potatoes (about 15 mins). (Salmon)', true), 'boil the potatoes about 15 mins');
});

test('the builder merges near-identical steps and keeps the fuller wording', () => {
  const f = files();
  f.set('recipes/b.md', f.get('recipes/b.md')!.replace('1. Cook the quinoa.', '1. Cook the quinoa. Refrigerate.'));
  const repo = loadRepo(f);
  const lists = buildWeekLists(repo.plans[0], repo.recipes, repo.sauces, repo.catalog);
  assert.equal(lists.sundayPrep[0], 'Cook the quinoa. Refrigerate. (Bowls, Salmon)');
  assert.equal(lists.sundayPrep.filter((s) => /quinoa/i.test(s)).length, 1);
});

test('the validator warns about duplicate Sunday Prep steps in a plan', () => {
  const plan = '# Week\n\n## Monday: Leftovers\n\n## Sunday Prep\n- [ ] Cook the quinoa. Refrigerate. (A)\n- [ ] Roast carrots. (B)\n- [x] cook the quinoa (C)\n';
  const { issues } = parsePlan('2026/October/2026-10-05.md', plan);
  assert.deepEqual(issues.items.map((i) => [i.level, i.line, i.message]), [
    ['warning', 8, 'Same Sunday Prep step as line 6; merge them into one line naming both recipes'],
  ]);
});

const mon: DraftDay = { day: 0, recipePath: 'recipes/a.md', label: '', cook: 'Ali', notes: ['Double the sauce.'] };
const thu: DraftDay = { day: 3, recipePath: null, label: 'Pizza night', cook: 'Sean', notes: [] };

test('swapping two nights moves each dinner, its cook, and its notes, and keeps every day in place', () => {
  const week = [mon, thu];
  const swapped = swapDraftDays(week, 0, 3);
  assert.deepEqual(swapped, [{ ...thu, day: 0 }, { ...mon, day: 3 }]);
  assert.deepEqual(swapped.map((d) => d.day), [0, 3]);
  assert.deepEqual(swapDraftDays(swapped, 0, 3), swapDraftDays(swapped, 3, 0)); // same either way round
  assert.deepEqual(swapDraftDays(swapped, 3, 0), week); // its own inverse
  assert.equal(swapDraftDays(week, 1, 3), week); // a day with nothing planned is left alone
  assert.equal(swapDraftDays(week, 0, 0), week);
});

test('a swapped week saves with the nights swapped and the lists rebuilt from the new order', () => {
  const repo = loadRepo(files());
  const draft: DraftDay[] = [
    { day: 0, recipePath: 'recipes/a.md', label: '', cook: 'Ali', notes: ['Extra cauliflower'] },
    { day: 1, recipePath: 'recipes/b.md', label: '', cook: 'Sean', notes: [] },
  ];
  const text = buildPlanText(
    '2026-10-05',
    swapDraftDays(draft, 0, 1),
    repo.recipes,
    repo.sauces,
    repo.catalog,
    files().get('2026/October/2026-10-05.md')!,
  );
  const { plan, issues } = parsePlan('2026/October/2026-10-05.md', text);
  assert.deepEqual(issues.items, []);
  assert.deepEqual(plan.days.map((d) => [d.day, d.recipePath, d.cook, d.notes]), [
    ['Monday', 'recipes/b.md', 'Sean', []],
    ['Tuesday', 'recipes/a.md', 'Ali', ['Extra cauliflower']],
  ]);
  assert.match(text, /- \[ \] Cook the quinoa\. \(Salmon, Bowls\)/); // prep order follows the new week order
  assert.match(text, /- \[x\] Lemon \(3\) — Sean/); // a checked item survives a swap
});
