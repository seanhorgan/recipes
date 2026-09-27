import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRepo } from '../src/lib/repo.ts';
import { buildWeekLists, writeWeekLists } from '../src/lib/weekLists.ts';
import { agentContext } from '../src/lib/agentContext.ts';

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
    'Make the Yogurt Sauce (for Bowls)',
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
});
