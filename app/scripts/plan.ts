// Helpers for agents (and people) planning a week. See skills/plan-week/SKILL.md.
//
//   npm run plan -- context [--date YYYY-MM-DD] [--out FILE]
//       Print the planning context: next week's file path, recent weeks, and every recipe with its
//       protein, style, times, rating, last-cooked date, and key ingredients.
//   npm run plan -- new YYYY-MM-DD mon=<slug>[:Cook] tue=<slug> ... [--force]
//       Create the plan for the week starting that Monday, then fill in Sunday Prep and the Shopping List.
//       A value with spaces is a plain night ("fri=Pizza night").
//   npm run plan -- fill YYYY-MM-DD
//       Rebuild Sunday Prep and the Shopping List after editing a plan by hand (keeps checked items).
//   npm run plan -- check YYYY-MM-DD
//       Print the variety check and any problems, without changing anything.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadRepo, cookHistory, type Repo } from '../src/lib/repo.ts';
import { agentContext } from '../src/lib/agentContext.ts';
import { buildWeekLists, renderPlanDays, writeWeekLists, type DraftDay } from '../src/lib/weekLists.ts';
import { varietyReport } from '../src/lib/variety.ts';
import { parsePlan } from '../src/lib/plan.ts';
import { PROTEINS } from '../src/lib/recipe.ts';
import { formatLong, isIsoDate, planPath, weekdayIndex } from '../src/lib/dates.ts';
import { readRepoFiles, REPO_ROOT } from './repoFiles.ts';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

function mondayArg(value: string | undefined): string {
  if (!value || !isIsoDate(value)) fail('give the week as its Monday, e.g. 2026-10-05');
  if (weekdayIndex(value) !== 0) fail(`${value} is not a Monday`);
  return value;
}

/** Fill Sunday Prep + Shopping List, write the file, and report. */
function fillAndReport(monday: string, text: string): void {
  const path = planPath(monday);
  // Load the repo with this plan's current text so lists and checks see it.
  const files = readRepoFiles();
  files.set(path, text);
  let repo = loadRepo(files);
  const plan = repo.plans.find((p) => p.path === path)!;
  const filled = writeWeekLists(text, buildWeekLists(plan, repo.recipes, repo.sauces, repo.catalog));
  mkdirSync(dirname(join(REPO_ROOT, path)), { recursive: true });
  writeFileSync(join(REPO_ROOT, path), filled);
  console.log(`Wrote ${path}\n`);
  files.set(path, filled);
  repo = loadRepo(files);
  report(repo, path);
}

function report(repo: Repo, path: string): void {
  const plan = repo.plans.find((p) => p.path === path);
  if (!plan) fail(`no plan at ${path}`);
  const v = varietyReport(plan, repo.recipes, repo.catalog, cookHistory(repo.plans));
  console.log(`Week of ${formatLong(plan.monday)}`);
  for (const d of plan.days) {
    const r = d.recipePath ? repo.recipes.get(d.recipePath) : undefined;
    console.log(`  ${d.day.padEnd(9)} ${d.label}${r ? `  [${r.protein}, ${r.weeknightMinutes} min]` : ''}${d.cook ? `  cook: ${d.cook}` : ''}`);
  }
  const prep = plan.days.reduce((sum, d) => sum + ((d.recipePath && repo.recipes.get(d.recipePath)?.prepMinutes) || 0), 0);
  console.log(`\nProteins: ${PROTEINS.filter((p) => v.proteins[p]).map((p) => `${p} ${v.proteins[p]}`).join(', ')}`);
  console.log(
    `Sunday prep: about ${prep} min` +
      (plan.sundayPrep.length ? ` across ${plan.sundayPrep.length} steps` : ` (no checklist yet; run "npm run plan -- fill ${plan.monday}")`),
  );
  const flags = [
    ...v.repeatedKeys.map((k) => `key ingredient ${k.ingredient} in: ${k.recipes.join(', ')}`),
    ...v.repeatedTags.map((t) => `dish style "${t.tag}" repeated: ${t.recipes.join(', ')}`),
    ...v.recentRepeats.map((r) => `${r.recipe} was also planned ${r.lastDate} (within 4 weeks)`),
  ];
  console.log(flags.length ? `\nVariety warnings:\n${flags.map((f) => `  - ${f}`).join('\n')}` : '\nVariety: no warnings.');
  const issues = repo.issues.filter((i) => i.file === path);
  if (issues.length) {
    console.log(`\nProblems in ${path}:`);
    for (const i of issues) console.log(`  ${i.level}: ${i.line ? `line ${i.line}: ` : ''}${i.message}`);
    if (issues.some((i) => i.level === 'error')) process.exit(1);
  }
}

const [command, ...args] = process.argv.slice(2);

if (command === 'context') {
  const date = option(args, '--date') ?? localToday();
  if (!isIsoDate(date)) fail('--date must be YYYY-MM-DD');
  const text = agentContext(loadRepo(readRepoFiles()), date);
  const out = option(args, '--out');
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text);
    console.log(`Wrote ${out}`);
  } else {
    console.log(text);
  }
} else if (command === 'new') {
  const monday = mondayArg(args[0]);
  const path = planPath(monday);
  if (existsSync(join(REPO_ROOT, path)) && !args.includes('--force')) {
    fail(`${path} already exists. Edit it and run "npm run plan -- fill ${monday}", or pass --force to replace it.`);
  }
  const repo = loadRepo(readRepoFiles());
  const assignments = args.slice(1).filter((a) => a.includes('='));
  if (!assignments.length) fail('list the dinners, e.g. mon=lemon-dill-salmon-asparagus tue=red-lentil-coconut-dal:Ali');
  const days: DraftDay[] = [];
  for (const a of assignments) {
    const [key, ...rest] = a.split('=');
    const idx = DAY_KEYS.indexOf(key.toLowerCase());
    if (idx === -1) fail(`"${key}" is not a day; use ${DAY_KEYS.join(', ')}`);
    const [slug, cook] = rest.join('=').split(':');
    const recipePath = `recipes/${slug}.md`;
    if (!repo.recipes.has(recipePath) && !/\s/.test(slug)) {
      const near = [...repo.recipes.values()].filter((r) => slug.split('-').some((w) => w.length > 3 && r.slug.includes(w)));
      fail(`no recipe "${recipePath}"` + (near.length ? `. Did you mean: ${near.slice(0, 5).map((r) => r.slug).join(', ')}?` : ''));
    }
    days.push({ day: idx, recipePath: repo.recipes.has(recipePath) ? recipePath : null, label: slug, cook: cook || null, notes: [] });
  }
  fillAndReport(monday, renderPlanDays(monday, days, repo.recipes));
} else if (command === 'fill' || command === 'check') {
  const monday = mondayArg(args[0]);
  const path = planPath(monday);
  if (!existsSync(join(REPO_ROOT, path))) fail(`no plan at ${path}; create it with "npm run plan -- new ${monday} ..."`);
  const text = readFileSync(join(REPO_ROOT, path), 'utf8');
  if (command === 'fill') {
    fillAndReport(monday, text);
  } else {
    const { issues } = parsePlan(path, text);
    report(loadRepo(readRepoFiles()), path);
    if (issues.items.some((i) => i.level === 'error')) process.exit(1);
  }
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(command ? 1 : 0);
}
