import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRepo, cookHistory } from '../src/lib/repo.ts';
import { varietyReport } from '../src/lib/variety.ts';

const CATALOG = `| Ingredient | Aisle | Kind | Buy as | Also called |
|---|---|---|---|---|
| Asparagus | Produce | key | | |
| Salmon | Seafood | key | | |
| Lemon | Produce | | | |
`;

const recipe = (title: string, protein: string, tag: string, ingredients: string) =>
  `---\nprotein: ${protein}\ngluten_free: yes\nprep_minutes: 0\nweeknight_minutes: 20\ntags: [${tag}]\n---\n# ${title}\n\n## Ingredients\n${ingredients}\n\n## Weeknight\n1. Cook.\n`;

test('variety report flags repeated key ingredients, formats, and recent repeats', () => {
  const files = new Map([
    ['reference/ingredients.md', CATALOG],
    ['recipes/a.md', recipe('A', 'fish', 'sheet-pan', '- 1 lb salmon\n- 1 bunch asparagus\n- 1 lemon')],
    ['recipes/b.md', recipe('B', 'plant', 'sheet-pan', '- 1 bunch asparagus\n- 1 lemon\n- Optional: 1 lb salmon')],
    ['recipes/c.md', recipe('C', 'plant', 'bowl', '- 1 lemon')],
    ['2026/August/2026-08-24.md', '# W\n\n## Monday: [A](../../recipes/a.md)\n'],
    ['2026/September/2026-09-07.md', '# W\n\n## Monday: [A](../../recipes/a.md)\n\n## Tuesday: [B](../../recipes/b.md)\n\n## Wednesday: [C](../../recipes/c.md)\n'],
  ]);
  const repo = loadRepo(files);
  assert.deepEqual(repo.issues.filter((i) => i.level === 'error'), []);
  const plan = repo.plans.find((p) => p.monday === '2026-09-07')!;
  const report = varietyReport(plan, repo.recipes, repo.catalog, cookHistory(repo.plans));
  assert.equal(report.proteins.fish, 1);
  assert.equal(report.proteins.plant, 2);
  assert.deepEqual(report.repeatedKeys.map((k) => k.ingredient), ['Asparagus']); // optional salmon doesn't count
  assert.deepEqual(report.repeatedTags.map((t) => t.tag), ['sheet-pan']);
  assert.deepEqual(report.recentRepeats, [{ recipe: 'A', lastDate: '2026-08-24' }]);
});

test('variety report flags seafood on back-to-back nights and last week\'s proteins', () => {
  const files = new Map([
    ['reference/ingredients.md', CATALOG + '| Shrimp | Seafood | key | | |\n'],
    ['recipes/salmon.md', recipe('Salmon', 'fish', 'sheet-pan', '- 1 lb salmon')],
    ['recipes/shrimp.md', recipe('Shrimp', 'shellfish', 'stir-fry', '- 1 lb shrimp')],
    ['recipes/bowl.md', recipe('Bowl', 'plant', 'bowl', '- 1 lemon')],
    ['2026/September/2026-09-07.md', '# W\n\n## Tuesday: [Shrimp](../../recipes/shrimp.md)\n'],
    ['2026/September/2026-09-14.md', '# W\n\n## Monday: [Salmon](../../recipes/salmon.md)\n\n## Tuesday: [Shrimp](../../recipes/shrimp.md)\n\n## Wednesday: [Bowl](../../recipes/bowl.md)\n'],
  ]);
  const repo = loadRepo(files);
  const plan = repo.plans.find((p) => p.monday === '2026-09-14')!;
  const report = varietyReport(plan, repo.recipes, repo.catalog, cookHistory(repo.plans));
  assert.deepEqual(report.backToBackSeafood, [{ days: ['Monday', 'Tuesday'], recipes: ['Salmon', 'Shrimp'] }]);
  assert.deepEqual(report.lastWeekProteins, [{ ingredient: 'Shrimp', recipe: 'Shrimp' }]);
});
