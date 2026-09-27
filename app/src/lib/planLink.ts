// Planner links: a URL that opens the app's planner already filled in, so an assistant without access to the repo
// (like Claude chat) can hand over a week's plan and the family saves it from the app.
//
//   https://seanhorgan.github.io/recipes/#/plan/2026-10-05?mon=lemon-dill-salmon-asparagus:Ali&fri=Pizza%20night
//
// - Day keys: mon, tue, wed, thu, fri, sat, sun.
// - Value: a recipe's file name without .md (its "slug"), or plain text for a night without a recipe ("Pizza night").
// - ":Name" at the end sets the cook, e.g. ":Ali".
// - "<day>.note=..." adds a note to that night (repeat for several notes).
import { kebab } from './markdown.ts';
import type { Recipe } from './recipe.ts';
import type { DraftDay } from './weekLists.ts';

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const SITE_URL = 'https://seanhorgan.github.io/recipes/';

export interface LinkDraft {
  days: DraftDay[];
  /** Things the family should fix before saving, e.g. a recipe that hasn't been added yet. */
  problems: string[];
}

/** The draft a planner link describes, or null if the query has no days. */
export function parsePlanLink(query: string, recipes: Map<string, Recipe>): LinkDraft | null {
  const params = new URLSearchParams(query);
  const days: DraftDay[] = [];
  const problems: string[] = [];
  DAY_KEYS.forEach((key, day) => {
    const raw = params.get(key)?.trim();
    const notes = params.getAll(`${key}.note`).map((n) => n.trim()).filter(Boolean);
    if (!raw && !notes.length) return;
    let value = raw ?? '';
    let cook: string | null = null;
    const withCook = /^(.*):\s*([A-Za-z][A-Za-z'-]*)$/.exec(value);
    if (withCook) {
      value = withCook[1].trim();
      cook = withCook[2];
    }
    const path = `recipes/${value}.md`;
    if (recipes.has(path)) {
      days.push({ day, recipePath: path, label: '', cook, notes });
    } else if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(value)) {
      problems.push(`"${value}" isn't in the recipe box yet. Add it (Recipes → Add recipe), then open the link again.`);
      days.push({ day, recipePath: null, label: '', cook, notes });
    } else {
      days.push({ day, recipePath: null, label: value, cook, notes });
    }
  });
  return days.length ? { days, problems } : null;
}

/** Build a planner link (used in docs, tests, and the published planning context). */
export function planLink(monday: string, days: { day: number; slug?: string; label?: string; cook?: string; notes?: string[] }[]): string {
  const params = new URLSearchParams();
  for (const d of days) {
    const key = DAY_KEYS[d.day];
    params.set(key, `${d.slug ?? d.label ?? ''}${d.cook ? `:${d.cook}` : ''}`);
    for (const n of d.notes ?? []) params.append(`${key}.note`, n);
  }
  return `${SITE_URL}#/plan/${monday}?${params.toString().replace(/\+/g, '%20')}`;
}

/** The file name a recipe with this title gets: lowercase words joined by hyphens. */
export function slugForTitle(title: string): string {
  return kebab(title);
}
