// Recipe search shared by the app and `npm run plan -- find`: comma-separated terms ("salmon, asparagus, lemon")
// match recipe titles and ingredient names, ignoring case and plurals. Useful for "what can I make with what we have?"
import { normalizeName } from './ingredients.ts';
import type { Recipe } from './recipe.ts';

export function searchTerms(query: string): string[] {
  return [...new Set(query.split(',').map((t) => normalizeName(t)).filter(Boolean))];
}

/** The search terms this recipe matches: in its title or ingredient lines (a linked sauce counts by its name). */
export function matchedTerms(recipe: Recipe, terms: string[]): string[] {
  const haystack = [recipe.title, ...recipe.ingredients.map((i) => i.name)].map((t) => ` ${normalizeName(t)} `);
  // Match at the start of a word, so "tomato" finds "cherry tomatoes" but "pea" doesn't find "pepper".
  return terms.filter((term) => haystack.some((h) => h.includes(` ${term}`)));
}

export interface SearchResult {
  recipe: Recipe;
  matched: string[];
}

/**
 * Recipes matching the query. One term: recipes that match it. Several terms: recipes matching any of them,
 * best matches first (ties keep the input order). An empty query returns everything.
 */
export function searchRecipes(recipes: Recipe[], query: string): SearchResult[] {
  const terms = searchTerms(query);
  if (!terms.length) return recipes.map((recipe) => ({ recipe, matched: [] }));
  return recipes
    .map((recipe, i) => ({ recipe, matched: matchedTerms(recipe, terms), i }))
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length || a.i - b.i)
    .map(({ recipe, matched }) => ({ recipe, matched }));
}
