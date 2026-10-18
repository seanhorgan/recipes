// Variety checks for a week of dinners (rules: reference/planning.md → Variety).
import { matchIngredient, type Catalog } from './ingredients.ts';
import { PROTEINS, type Protein, type Recipe } from './recipe.ts';
import type { Plan } from './plan.ts';
import { addDays } from './dates.ts';

export interface VarietyReport {
  proteins: Record<Protein, number>;
  /** Key ingredients used by 2+ dinners this week, with the recipe titles that use them. */
  repeatedKeys: { ingredient: string; recipes: string[] }[];
  /** Dish formats (tags) used by 2+ dinners this week. */
  repeatedTags: { tag: string; recipes: string[] }[];
  /** Dinners that were also planned in the 4 weeks before this one. */
  recentRepeats: { recipe: string; lastDate: string }[];
  /** Fish or shellfish dinners on two nights in a row. */
  backToBackSeafood: { days: [string, string]; recipes: [string, string] }[];
  /** Key seafood, meat, or poultry ingredients that were also in the week before this one. */
  lastWeekProteins: { ingredient: string; recipe: string }[];
}

const SEAFOOD: Protein[] = ['fish', 'shellfish'];
const PROTEIN_AISLES = ['Seafood', 'Meat & Poultry'];

function repeats(pairs: [string, string][]): { key: string; recipes: string[] }[] {
  const by = new Map<string, string[]>();
  for (const [key, title] of pairs) {
    const list = by.get(key) ?? [];
    if (!list.includes(title)) list.push(title);
    by.set(key, list);
  }
  return [...by].filter(([, r]) => r.length > 1).map(([key, recipes]) => ({ key, recipes }));
}

export function varietyReport(
  plan: Plan,
  recipes: Map<string, Recipe>,
  catalog: Catalog,
  history: Map<string, string[]>,
): VarietyReport {
  const proteins = Object.fromEntries(PROTEINS.map((p) => [p, 0])) as Record<Protein, number>;
  const keyPairs: [string, string][] = [];
  const tagPairs: [string, string][] = [];
  const recentRepeats: VarietyReport['recentRepeats'] = [];
  const windowStart = plan.monday ? addDays(plan.monday, -28) : '';
  const backToBackSeafood: VarietyReport['backToBackSeafood'] = [];
  const lastWeekProteins: VarietyReport['lastWeekProteins'] = [];
  const lastWeekStart = plan.monday ? addDays(plan.monday, -7) : '';
  const lastWeekKeys = new Set<string>();
  for (const [path, dates] of history) {
    const r = recipes.get(path);
    if (!r || !dates.some((d) => d >= lastWeekStart && d < plan.monday)) continue;
    for (const ing of r.ingredients) {
      const entry = ing.optional || ing.link ? undefined : matchIngredient(catalog, ing.name);
      if (entry?.kind === 'key' && PROTEIN_AISLES.includes(entry.aisle)) lastWeekKeys.add(entry.name);
    }
  }
  let prev: { date: string; day: string; recipe: Recipe } | undefined;

  for (const day of plan.days) {
    const r = day.recipePath ? recipes.get(day.recipePath) : undefined;
    if (!r) {
      prev = undefined;
      continue;
    }
    if (r.protein) proteins[r.protein]++;
    for (const ing of r.ingredients) {
      if (ing.optional || ing.link) continue;
      const entry = matchIngredient(catalog, ing.name);
      if (entry?.kind === 'key') keyPairs.push([entry.name, r.title]);
      if (entry && lastWeekKeys.has(entry.name) && !lastWeekProteins.some((p) => p.ingredient === entry.name)) {
        lastWeekProteins.push({ ingredient: entry.name, recipe: r.title });
      }
    }
    if (prev && addDays(prev.date, 1) === day.date && r.protein && prev.recipe.protein &&
        SEAFOOD.includes(r.protein) && SEAFOOD.includes(prev.recipe.protein)) {
      backToBackSeafood.push({ days: [prev.day, day.day], recipes: [prev.recipe.title, r.title] });
    }
    prev = { date: day.date, day: day.day, recipe: r };
    for (const t of r.tags) tagPairs.push([t, r.title]);
    const earlier = (history.get(r.path) ?? []).filter((d) => d >= windowStart && d < plan.monday);
    if (earlier.length) recentRepeats.push({ recipe: r.title, lastDate: earlier[earlier.length - 1] });
  }

  return {
    proteins,
    repeatedKeys: repeats(keyPairs).map(({ key, recipes }) => ({ ingredient: key, recipes })),
    repeatedTags: repeats(tagPairs).map(({ key, recipes }) => ({ tag: key, recipes })),
    recentRepeats,
    backToBackSeafood,
    lastWeekProteins,
  };
}
