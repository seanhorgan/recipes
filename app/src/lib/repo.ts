// Loads the whole repo (as a path → text map) and checks the files against each other.
// Pure: the validator feeds it files from disk, the app will feed it files from the GitHub API.
import { parseCatalog, matchIngredient, type Catalog } from './ingredients.ts';
import { parseRecipe, type Recipe } from './recipe.ts';
import { parsePlan, isPlanPath, type Plan } from './plan.ts';
import { resolveLink } from './markdown.ts';
import type { Issue } from './issues.ts';

export const CATALOG_PATH = 'reference/ingredients.md';

export interface Repo {
  catalog: Catalog;
  recipes: Map<string, Recipe>;
  sauces: Map<string, Recipe>;
  plans: Plan[];
  issues: Issue[];
}

export function isRecipePath(path: string): boolean {
  return /^recipes\/[^/]+\.md$/.test(path);
}

export function isSaucePath(path: string): boolean {
  return /^sauces\/[^/]+\.md$/.test(path);
}

export function loadRepo(files: Map<string, string>): Repo {
  const issues: Issue[] = [];
  const catalogText = files.get(CATALOG_PATH);
  if (catalogText === undefined) issues.push({ file: CATALOG_PATH, level: 'error', message: 'Ingredient catalog is missing' });
  const { catalog, issues: catalogIssues } = parseCatalog(catalogText ?? '');
  issues.push(...catalogIssues.items);

  const recipes = new Map<string, Recipe>();
  const sauces = new Map<string, Recipe>();
  const plans: Plan[] = [];
  for (const [path, text] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (isRecipePath(path) || isSaucePath(path)) {
      const { recipe, issues: ri } = parseRecipe(path, text);
      (recipe.kind === 'sauce' ? sauces : recipes).set(path, recipe);
      issues.push(...ri.items);
    } else if (isPlanPath(path)) {
      const { plan, issues: pi } = parsePlan(path, text);
      plans.push(plan);
      issues.push(...pi.items);
    }
  }
  plans.sort((a, b) => a.monday.localeCompare(b.monday));

  // Ingredients: catalog matches and sauce links.
  for (const r of [...recipes.values(), ...sauces.values()]) {
    for (const ing of r.ingredients) {
      if (ing.link) {
        const target = resolveLink(r.path, ing.link);
        if (!sauces.has(target)) {
          issues.push({ file: r.path, line: ing.line, level: 'error', message: `Linked sauce ${target} does not exist` });
        }
      } else if (ing.name && !matchIngredient(catalog, ing.name)) {
        issues.push({
          file: r.path, line: ing.line, level: 'warning',
          message: `"${ing.name}" is not in ${CATALOG_PATH}; add it (or an alias) so the shopping list can place it`,
        });
      }
    }
  }

  // Plans: recipe links.
  for (const p of plans) {
    for (const d of p.days) {
      if (d.recipePath && !recipes.has(d.recipePath)) {
        issues.push({ file: p.path, line: d.line, level: 'error', message: `Linked recipe ${d.recipePath} does not exist` });
      }
    }
  }

  // Ratings should be dated on a night the dish was on a plan.
  const history = cookHistory(plans);
  for (const r of recipes.values()) {
    const cooked = new Set(history.get(r.path) ?? []);
    for (const rating of r.ratings) {
      if (!cooked.has(rating.date)) {
        issues.push({
          file: r.path, line: rating.line, level: 'warning',
          message: `Rating date ${rating.date} is not a night this recipe appears in a weekly plan`,
        });
      }
    }
  }

  return { catalog, recipes, sauces, plans, issues };
}

/** Recipe path → dates it was planned, oldest first. This is the only source of "last cooked". */
export function cookHistory(plans: Plan[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const p of plans) {
    for (const d of p.days) {
      if (!d.recipePath || !d.date) continue;
      const dates = out.get(d.recipePath) ?? [];
      dates.push(d.date);
      out.set(d.recipePath, dates);
    }
  }
  for (const dates of out.values()) dates.sort();
  return out;
}
