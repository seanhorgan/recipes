// Recipes (recipes/*.md) and sauces (sauces/*.md). Format: protocols/schema.md
import { parseDocument, listItems, type Line, type Section } from './markdown.ts';
import { parseIngredientSection, type Ingredient } from './ingredients.ts';
import { IssueList } from './issues.ts';
import { isIsoDate } from './dates.ts';

export const PROTEINS = ['fish', 'shellfish', 'poultry', 'plant', 'egg'] as const;
export type Protein = (typeof PROTEINS)[number];

export const TAGS = [
  'bowl', 'sheet-pan', 'skillet', 'soup', 'pasta', 'tacos', 'flatbread', 'salad', 'stir-fry', 'baked',
] as const;

export type RecipeKind = 'recipe' | 'sauce';

export interface Rating {
  date: string;
  stars: number;
  note: string | null;
  line: number;
}

export interface Recipe {
  kind: RecipeKind;
  /** Repo-relative path, e.g. `recipes/lemon-dill-salmon-asparagus.md`. */
  path: string;
  slug: string;
  title: string;
  description: string | null;
  protein: Protein | null;
  glutenFree: 'yes' | 'swap' | null;
  prepMinutes: number;
  weeknightMinutes: number | null;
  tags: string[];
  ingredients: Ingredient[];
  sundayPrep: Line[];
  weeknight: Line[];
  /** Sauces only. */
  directions: Line[];
  kidBoost: Line[];
  notes: Line[];
  ratings: Rating[];
}

const RECIPE_SECTIONS = ['Ingredients', 'Sunday Prep', 'Weeknight', 'Kid Boost', 'Notes', 'Ratings'];
const SAUCE_SECTIONS = ['Ingredients', 'Directions', 'Notes', 'Ratings'];

export function parseRating(text: string, line: number): Rating | null {
  const m = /^(\d{4}-\d{2}-\d{2})\s+([★⭐☆️]+)\s*(?:[—–-]\s*)?(.*)$/.exec(text.trim());
  if (!m) return null;
  const stars = [...m[2]].filter((c) => c === '★' || c === '⭐').length;
  return { date: m[1], stars, note: m[3].trim() || null, line };
}

export function formatRating(r: Pick<Rating, 'date' | 'stars' | 'note'>): string {
  return `- ${r.date} ${'★'.repeat(r.stars)}${r.note ? ' ' + r.note : ''}`;
}

/** The recipe's current rating: the most recent one. */
export function currentRating(recipe: Recipe): Rating | null {
  return [...recipe.ratings].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
}

function nonNegativeInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null;
}

export function parseRecipe(path: string, text: string): { recipe: Recipe; issues: IssueList } {
  const issues = new IssueList(path);
  const kind: RecipeKind = path.startsWith('sauces/') ? 'sauce' : 'recipe';
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  const doc = parseDocument(text);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.error('File name must be lowercase-kebab-case, e.g. lemon-dill-salmon.md');
  }

  // Header
  const fm = doc.frontmatter ?? {};
  if (doc.frontmatterError) issues.error(doc.frontmatterError, 1);
  else if (!doc.frontmatter) issues.error('Missing the --- header at the top of the file (see protocols/schema.md)', 1);

  const allowed = kind === 'sauce' ? ['prep_minutes'] : ['protein', 'gluten_free', 'prep_minutes', 'weeknight_minutes', 'tags'];
  for (const key of Object.keys(fm)) {
    if (!allowed.includes(key)) issues.warn(`Unknown header field "${key}"`, 1);
  }

  const prepMinutes = nonNegativeInt(fm.prep_minutes);
  if (doc.frontmatter && prepMinutes === null) issues.error('prep_minutes must be a whole number (0 if no Sunday prep)', 1);

  let protein: Protein | null = null;
  let glutenFree: Recipe['glutenFree'] = null;
  let weeknightMinutes: number | null = null;
  let tags: string[] = [];
  if (kind === 'recipe' && doc.frontmatter) {
    if (PROTEINS.includes(fm.protein as Protein)) protein = fm.protein as Protein;
    else issues.error(`protein must be one of: ${PROTEINS.join(', ')}`, 1);

    // YAML reads a bare `yes` as a string in YAML 1.2, but accept `true` too.
    const gf = fm.gluten_free === true ? 'yes' : fm.gluten_free;
    if (gf === 'yes' || gf === 'swap') glutenFree = gf;
    else issues.error('gluten_free must be "yes" or "swap"', 1);

    weeknightMinutes = nonNegativeInt(fm.weeknight_minutes);
    if (weeknightMinutes === null) issues.error('weeknight_minutes must be a whole number', 1);
    else if (weeknightMinutes > 45) issues.warn(`weeknight_minutes is ${weeknightMinutes}; weeknights aim for 15–30`, 1);

    if (fm.tags !== undefined) {
      if (!Array.isArray(fm.tags)) issues.error('tags must be a list, e.g. [bowl, sheet-pan]', 1);
      else {
        tags = fm.tags.map(String);
        for (const t of tags) {
          if (!(TAGS as readonly string[]).includes(t)) issues.warn(`Unknown tag "${t}" (known: ${TAGS.join(', ')})`, 1);
        }
      }
    }
  }

  // Title & description
  if (!doc.title) issues.error('Missing the "# Title" line');
  const descLines = doc.preamble.filter((l) => l.text.trim());
  let description: string | null = null;
  if (descLines.length) {
    const d = /^[*_](.+)[*_]$/.exec(descLines.map((l) => l.text.trim()).join(' '));
    description = d ? d[1].trim() : descLines.map((l) => l.text.trim()).join(' ');
  }

  // Sections
  const known = kind === 'sauce' ? SAUCE_SECTIONS : RECIPE_SECTIONS;
  const byName = new Map<string, Section>();
  let lastIndex = -1;
  for (const s of doc.sections) {
    const idx = known.indexOf(s.heading);
    if (s.heading === 'History') {
      issues.error('"## History" is replaced by "## Ratings"; cook dates now come from the weekly plans', s.line);
    } else if (s.heading === 'Rating') {
      issues.error('Use "## Ratings" with dated lines, e.g. "- 2026-05-12 ★★★★ note"', s.line);
    } else if (kind === 'recipe' && s.heading === 'Directions') {
      issues.error('Split "## Directions" into "## Sunday Prep" and "## Weeknight"', s.line);
    } else if (idx === -1) {
      issues.warn(`Unknown section "## ${s.heading}" (known: ${known.join(', ')})`, s.line);
    } else {
      if (byName.has(s.heading)) issues.error(`"## ${s.heading}" appears twice`, s.line);
      if (idx < lastIndex) issues.warn(`"## ${s.heading}" is out of order (expected: ${known.join(', ')})`, s.line);
      lastIndex = Math.max(lastIndex, idx);
      byName.set(s.heading, s);
    }
  }

  const section = (name: string) => byName.get(name)?.lines ?? [];
  const required = kind === 'sauce' ? ['Ingredients', 'Directions'] : ['Ingredients', 'Weeknight'];
  for (const name of required) {
    if (!byName.has(name)) issues.error(`Missing "## ${name}"`);
    else if (!listItems(section(name)).length) issues.error(`"## ${name}" is empty`, byName.get(name)!.line);
  }

  const ingredients = parseIngredientSection(section('Ingredients'));
  for (const ing of ingredients) {
    if (!ing.name) issues.error(`Can't find an ingredient name in "${ing.raw}"`, ing.line);
  }

  const sundayPrep = listItems(section('Sunday Prep'));
  if (kind === 'recipe' && sundayPrep.length && prepMinutes === 0) {
    issues.warn('Has Sunday Prep steps but prep_minutes is 0', byName.get('Sunday Prep')!.line);
  }
  if (kind === 'recipe' && !sundayPrep.length && prepMinutes) {
    issues.warn(`prep_minutes is ${prepMinutes} but there is no "## Sunday Prep"`, 1);
  }

  const ratings: Rating[] = [];
  for (const item of listItems(section('Ratings'))) {
    const r = parseRating(item.text, item.line);
    if (!r) issues.error('Ratings look like "- 2026-05-12 ★★★★ optional note"', item.line);
    else if (!isIsoDate(r.date)) issues.error(`"${r.date}" is not a real date`, item.line);
    else if (r.stars < 1 || r.stars > 5) issues.error('A rating needs 1–5 stars', item.line);
    else ratings.push(r);
  }

  const recipe: Recipe = {
    kind,
    path,
    slug,
    title: doc.title ?? slug,
    description,
    protein,
    glutenFree,
    prepMinutes: prepMinutes ?? 0,
    weeknightMinutes,
    tags,
    ingredients,
    sundayPrep,
    weeknight: listItems(section('Weeknight')),
    directions: listItems(section('Directions')),
    kidBoost: listItems(section('Kid Boost')),
    notes: listItems(section('Notes')),
    ratings,
  };
  return { recipe, issues };
}
