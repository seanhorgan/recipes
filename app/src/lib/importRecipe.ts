// Checks a recipe pasted into the app (typically written by a chat assistant) before it's saved to the repo.
import { loadRepo } from './repo.ts';
import { parseDocument, kebab } from './markdown.ts';
import { addRating, parseRecipe, type Recipe } from './recipe.ts';

export interface PreparedRecipe {
  path: string;
  title: string;
  /** The file to save (for a replacement, before the old ratings are merged back in; see keepRatings). */
  text: string;
  recipe: Recipe;
  /** True if a recipe with this file name already exists. */
  replacing: boolean;
  errors: string[];
  warnings: string[];
}

/** Undo what copying from a chat tends to add: a ```markdown fence, Windows line endings, surrounding blank lines. */
export function cleanPastedMarkdown(pasted: string): string {
  let text = pasted.replace(/\r\n?/g, '\n').trim();
  const fenced = /^```[a-z]*\n([\s\S]*?)\n```$/i.exec(text);
  if (fenced) text = fenced[1].trim();
  return text + '\n';
}

export function prepareRecipe(pasted: string, files: ReadonlyMap<string, string>): PreparedRecipe | null {
  const text = cleanPastedMarkdown(pasted);
  if (!text.trim()) return null;
  const title = parseDocument(text).title?.trim() ?? '';
  const slug = kebab(title) || 'untitled';
  const path = `recipes/${slug}.md`;
  const replacing = files.has(path);

  // Check it exactly as the repo's validator would, alongside every other file.
  const repo = loadRepo(new Map([...files, [path, text]]));
  const issues = repo.issues.filter((i) => i.file === path);
  const where = (line?: number) => (line ? `Line ${line}: ` : '');
  const errors = issues.filter((i) => i.level === 'error').map((i) => where(i.line) + i.message);
  const warnings = issues
    .filter((i) => i.level === 'warning' && !/is not a night this recipe appears/.test(i.message))
    .map((i) => where(i.line) + i.message.replace(/ is not in reference\/ingredients\.md; add it \(or an alias\) so the shopping list can place it/, ' is new to the ingredient list, so it will go under "Other" on the shopping list'));
  if (!title) errors.unshift('Missing the "# Title" line');

  return { path, title, text, recipe: parseRecipe(path, text).recipe, replacing, errors, warnings };
}

/** When replacing a recipe, keep the family's ratings from the current version. */
export function keepRatings(newText: string, currentText: string | null): string {
  if (!currentText) return newText;
  const current = parseRecipe('recipes/x.md', currentText).recipe.ratings;
  const already = new Set(parseRecipe('recipes/x.md', newText).recipe.ratings.map((r) => r.date));
  return current.filter((r) => !already.has(r.date)).reduce((text, r) => addRating(text, r), newText);
}
