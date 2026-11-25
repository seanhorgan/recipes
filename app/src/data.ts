// The repo's data as the app sees it. It starts as the markdown bundled at build time (the site rebuilds on every
// push to main). On a connected device, sync.ts swaps in the live files from GitHub plus unsaved local edits.
import { useSyncExternalStore } from 'react';
import { loadRepo, cookHistory } from './lib/repo.ts';
import { toDate } from './lib/dates.ts';
import { focusWeek, type Plan } from './lib/plan.ts';
import type { Recipe } from './lib/recipe.ts';
import { parseFreeform, type FreeformPage } from './lib/freeform.ts';

const modules = import.meta.glob<string>(
  ['../../recipes/*.md', '../../sauces/*.md', '../../reference/ingredients.md', '../../20*/*/*.md'],
  { query: '?raw', import: 'default', eager: true },
);
export const bundledFiles: ReadonlyMap<string, string> = new Map(
  Object.entries(modules).map(([path, text]) => [path.replace(/^(\.\.\/)+/, ''), text]),
);

// Desserts are free-form pages outside dinner planning, so they stay out of loadRepo. They come from the build,
// which reruns on every push to main.
const dessertModules = import.meta.glob<string>('../../desserts/*.md', { query: '?raw', import: 'default', eager: true });
export const desserts: ReadonlyMap<string, FreeformPage> = new Map(
  Object.entries(dessertModules).map(([path, text]) => {
    const page = parseFreeform(path.replace(/^(\.\.\/)+/, ''), text);
    return [page.slug, page];
  }),
);

let files = new Map(bundledFiles);
// Live bindings: modules that import these always read the current snapshot.
export let repo = loadRepo(files);
export let history = cookHistory(repo.plans);

let version = 0;
const listeners = new Set<() => void>();

export function currentFiles(): ReadonlyMap<string, string> {
  return files;
}

/** Replace the data (all files, or just some paths) and re-render. */
export function setFiles(next: ReadonlyMap<string, string>, replaceAll = true): void {
  const merged = replaceAll ? new Map(next) : new Map([...files, ...next]);
  let changed = merged.size !== files.size;
  for (const [path, text] of merged) if (files.get(path) !== text) changed = true;
  if (!changed) return;
  files = merged;
  repo = loadRepo(files);
  history = cookHistory(repo.plans);
  version++;
  for (const l of listeners) l();
}

/** Re-render when the data changes. */
export function useDataVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}

export const REPO_URL = 'https://github.com/seanhorgan/recipes';

export function githubUrl(path: string, edit = false): string {
  return `${REPO_URL}/${edit ? 'edit' : 'blob'}/main/${path}`;
}

/** Today in the viewer's time zone, as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

export interface RecipeStats {
  /** Most recent planned night on or before today. */
  last: string | null;
  /** Next planned night after today. */
  next: string | null;
  /** Nights planned on or before today. */
  count: number;
}

export function recipeStats(recipe: Recipe, today: string): RecipeStats {
  const dates = history.get(recipe.path) ?? [];
  const past = dates.filter((d) => d <= today);
  return { last: past.at(-1) ?? null, next: dates.find((d) => d > today) ?? null, count: past.length };
}

/**
 * Monday of the week the family is focused on: next week from Sunday (when it gets planned, shopped, and prepped),
 * or as soon as this week's plan has no nights left. See focusWeek in lib/plan.ts.
 */
export function focusMonday(today: string): string {
  return focusWeek(today, repo.plans);
}

/** The plan for the focus week, else the next upcoming plan. */
export function currentPlan(today: string): Plan | null {
  const monday = focusMonday(today);
  return repo.plans.find((p) => p.monday === monday) ?? repo.plans.find((p) => p.monday > monday) ?? null;
}

export function latestPlan(): Plan | null {
  return repo.plans.at(-1) ?? null;
}

export function recipeBySlug(slug: string): Recipe | undefined {
  return repo.recipes.get(`recipes/${slug}.md`);
}

export function sauceBySlug(slug: string): Recipe | undefined {
  return repo.sauces.get(`sauces/${slug}.md`);
}
