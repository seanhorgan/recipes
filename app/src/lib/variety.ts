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
}

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

  for (const day of plan.days) {
    const r = day.recipePath ? recipes.get(day.recipePath) : undefined;
    if (!r) continue;
    if (r.protein) proteins[r.protein]++;
    for (const ing of r.ingredients) {
      if (ing.optional || ing.link) continue;
      const entry = matchIngredient(catalog, ing.name);
      if (entry?.kind === 'key') keyPairs.push([entry.name, r.title]);
    }
    for (const t of r.tags) tagPairs.push([t, r.title]);
    const earlier = (history.get(r.path) ?? []).filter((d) => d >= windowStart && d < plan.monday);
    if (earlier.length) recentRepeats.push({ recipe: r.title, lastDate: earlier[earlier.length - 1] });
  }

  return {
    proteins,
    repeatedKeys: repeats(keyPairs).map(({ key, recipes }) => ({ ingredient: key, recipes })),
    repeatedTags: repeats(tagPairs).map(({ key, recipes }) => ({ tag: key, recipes })),
    recentRepeats,
  };
}
