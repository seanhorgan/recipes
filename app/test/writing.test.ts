import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setChecklistItem, parsePlan } from '../src/lib/plan.ts';
import { buildPlanText, type DraftDay } from '../src/lib/weekLists.ts';
import { WriteQueue, type RemoteFile, type Remote } from '../src/lib/writeQueue.ts';
import { loadRepo } from '../src/lib/repo.ts';

const PLAN = `# Week of October 5, 2026

## Monday: Leftovers

## Sunday Prep
- [ ] Cook the quinoa. (Bowls)

## Shopping List
### Produce
- [ ] Lemon (2)
- [x] Kale (1 bunch) — Sean
`;

test('setChecklistItem checks and unchecks by text, only in the named section', () => {
  const checked = setChecklistItem(PLAN, 'Shopping List', 'Lemon (2)', true);
  assert.match(checked, /- \[x\] Lemon \(2\)/);
  const unchecked = setChecklistItem(checked, 'Shopping List', 'Kale (1 bunch)', false);
  assert.match(unchecked, /- \[ \] Kale \(1 bunch\) — Sean/);
  assert.equal(setChecklistItem(PLAN, 'Sunday Prep', 'Lemon (2)', true), PLAN);
  assert.equal(setChecklistItem(PLAN, 'Shopping List', 'Nope', true), PLAN);
  // Idempotent: applying twice is the same as once.
  assert.equal(setChecklistItem(checked, 'Shopping List', 'Lemon (2)', true), checked);
});

const CATALOG = `| Ingredient | Aisle | Kind | Buy as | Also called |
|---|---|---|---|---|
| Quinoa | Grains & Pasta | | | cooked quinoa |
| Lemon | Produce | | | |
`;
const RECIPE = `---\nprotein: plant\ngluten_free: yes\nprep_minutes: 10\nweeknight_minutes: 20\n---\n# Bowls\n\n## Ingredients\n- 2 cups cooked quinoa\n- 2 lemon\n\n## Sunday Prep\n1. Cook the quinoa.\n\n## Weeknight\n1. Eat.\n`;

test('buildPlanText writes a valid plan and keeps checks from the previous version', () => {
  const repo = loadRepo(new Map([['reference/ingredients.md', CATALOG], ['recipes/bowls.md', RECIPE]]));
  const days: DraftDay[] = [
    { day: 0, recipePath: 'recipes/bowls.md', label: '', cook: 'Ali', notes: ['Kid boost: edamame.'] },
    { day: 4, recipePath: null, label: 'Pizza night', cook: null, notes: [] },
  ];
  const previous = PLAN.replace('- [ ] Lemon (2)', '- [x] Lemon (2)');
  const text = buildPlanText('2026-10-05', days, repo.recipes, repo.sauces, repo.catalog, previous);
  assert.match(text, /^# Week of October 5, 2026\n\n## Monday: \[Bowls\]\(\.\.\/\.\.\/recipes\/bowls\.md\)\nCook: Ali\nKid boost: edamame\.\n\n## Friday: Pizza night\n/);
  assert.match(text, /- \[ \] Cook the quinoa\. \(Bowls\)/);
  assert.match(text, /- \[x\] Lemon \(2\)/);
  const { plan, issues } = parsePlan('2026/October/2026-10-05.md', text);
  assert.deepEqual(issues.items, []);
  assert.deepEqual(plan.days.map((d) => [d.day, d.recipePath, d.cook]), [['Monday', 'recipes/bowls.md', 'Ali'], ['Friday', null, null]]);
});

/** An in-memory stand-in for the GitHub contents API, with optimistic concurrency on sha. */
class FakeRemote implements Remote {
  files = new Map<string, RemoteFile>();
  commits: string[] = [];
  private n = 0;
  async get(path: string) {
    return this.files.get(path) ?? null;
  }
  async put(path: string, text: string, sha: string | null, message: string) {
    const current = this.files.get(path);
    if ((current?.sha ?? null) !== sha) throw Object.assign(new Error('sha mismatch'), { status: 409 });
    const saved = { text, sha: `sha${++this.n}` };
    this.files.set(path, saved);
    this.commits.push(message);
    return saved;
  }
  /** Simulate someone else committing. */
  external(path: string, text: string) {
    this.files.set(path, { text, sha: `sha${++this.n}` });
  }
}

const P = '2026/October/2026-10-05.md';
const check = (item: string) => ({
  apply: (t: string | null) => setChecklistItem(t ?? '', 'Shopping List', item, true),
  describe: `check ${item}`,
});

test('queued edits show locally at once and commit together', async () => {
  const remote = new FakeRemote();
  remote.external(P, PLAN);
  const q = new WriteQueue(remote, () => 'Ali');
  q.setBase(new Map([[P, remote.files.get(P)!]]));
  q.add(P, check('Lemon (2)'));
  assert.match(q.local(P)!, /- \[x\] Lemon/);
  assert.equal(remote.files.get(P)!.text, PLAN);
  assert.deepEqual(await q.flush(), [P]);
  assert.match(remote.files.get(P)!.text, /- \[x\] Lemon/);
  assert.deepEqual(remote.commits, ['Check Lemon (2) (by Ali, via app)']);
  assert.equal(q.size, 0);
});

test('a concurrent change is kept: edits are re-applied to the newer file', async () => {
  const remote = new FakeRemote();
  remote.external(P, PLAN);
  const q = new WriteQueue(remote, () => 'Sean');
  q.setBase(new Map([[P, remote.files.get(P)!]]));
  q.add(P, check('Lemon (2)'));
  // Meanwhile, the other adult unchecks Kale from their phone.
  remote.external(P, setChecklistItem(PLAN, 'Shopping List', 'Kale (1 bunch)', false));
  await q.flush();
  const text = remote.files.get(P)!.text;
  assert.match(text, /- \[x\] Lemon \(2\)/);
  assert.match(text, /- \[ \] Kale \(1 bunch\) — Sean/);
  assert.equal(remote.commits.length, 1);
});

test('new files are created, no-op edits are skipped, and invalid results are refused', async () => {
  const remote = new FakeRemote();
  const q = new WriteQueue(remote, () => 'Ali', (_path, text) => (text.includes('BAD') ? 'broken plan' : null));
  q.add(P, { apply: () => PLAN, describe: 'plan week of October 5' });
  await q.flush();
  assert.equal(remote.files.get(P)!.text, PLAN);

  q.add(P, check('Nope'));
  assert.deepEqual(await q.flush(), []);
  assert.equal(remote.commits.length, 1);

  q.add(P, { apply: () => 'BAD', describe: 'break it' });
  await assert.rejects(q.flush(), /not saved: broken plan/);
  assert.equal(q.size, 0);
  assert.equal(remote.files.get(P)!.text, PLAN);
});

test('other errors keep the edits pending so they can be retried', async () => {
  const remote = new FakeRemote();
  remote.external(P, PLAN);
  const q = new WriteQueue(remote, () => 'Ali');
  q.setBase(new Map([[P, remote.files.get(P)!]]));
  const put = remote.put.bind(remote);
  remote.put = async () => {
    throw Object.assign(new Error('Bad credentials'), { status: 401 });
  };
  q.add(P, check('Lemon (2)'));
  await assert.rejects(q.flush(), /Bad credentials/);
  assert.equal(q.size, 1);
  remote.put = put;
  await q.flush();
  assert.match(remote.files.get(P)!.text, /- \[x\] Lemon/);
});
