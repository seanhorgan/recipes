// Ingredient lines (`- 1.5 lb salmon fillets, skin on`) and the catalog in protocols/ingredients.md.
import type { Line } from './markdown.ts';
import { IssueList } from './issues.ts';

export interface Quantity {
  min: number;
  max: number;
}

export interface Ingredient {
  raw: string;
  line: number;
  quantity: Quantity | null;
  /** Singular unit, e.g. `can`, or null for plain counts ("2 avocados"). */
  unit: string | null;
  /** Package size in parentheses after the unit, e.g. `23 oz` in `1 jar (23 oz) marinara sauce`. */
  size: string | null;
  name: string;
  note: string | null;
  optional: boolean;
  /** Repo-relative href as written, for sauce links. */
  link: string | null;
  /** The `### Subheading` the line sits under, if any. */
  group: string | null;
}

const UNITS: Record<string, string> = {};
for (const [unit, plural] of [
  ['tsp', 'tsps'], ['tbsp', 'tbsps'], ['cup', 'cups'], ['oz', 'ozs'], ['lb', 'lbs'], ['g', 'gs'], ['ml', 'mls'],
  ['quart', 'quarts'], ['can', 'cans'], ['jar', 'jars'], ['bag', 'bags'], ['box', 'boxes'], ['bunch', 'bunches'],
  ['head', 'heads'], ['clove', 'cloves'], ['block', 'blocks'], ['pack', 'packs'], ['package', 'packages'],
  ['tube', 'tubes'], ['loaf', 'loaves'], ['link', 'links'], ['fillet', 'fillets'], ['handful', 'handfuls'],
  ['packet', 'packets'], ['pinch', 'pinches'], ['batch', 'batches'], ['carton', 'cartons'],
]) {
  UNITS[unit] = unit;
  UNITS[plural] = unit;
}

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const NUM = String.raw`(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔])`;
const QTY_RE = new RegExp(String.raw`^(${NUM})(?:\s*[-–]\s*(${NUM}))?\s+`);

function parseNumber(s: string): number {
  if (s in FRACTIONS) return FRACTIONS[s];
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(s);
}

/** Index of the first comma outside parentheses, or -1. */
function topLevelComma(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth = Math.max(0, depth - 1);
    else if (s[i] === ',' && depth === 0) return i;
  }
  return -1;
}

export function parseIngredientLine(text: string, line = 0, group: string | null = null): Ingredient {
  let rest = text.trim();
  const optional = /^optional:\s*/i.test(rest);
  rest = rest.replace(/^optional:\s*/i, '');

  let quantity: Quantity | null = null;
  const q = QTY_RE.exec(rest);
  if (q) {
    const min = parseNumber(q[1]);
    quantity = { min, max: q[2] ? parseNumber(q[2]) : min };
    rest = rest.slice(q[0].length);
  }

  let unit: string | null = null;
  let size: string | null = null;
  if (quantity) {
    const u = /^([A-Za-z]+)\.?(?:\s+|$)/.exec(rest);
    if (u && UNITS[u[1].toLowerCase()]) {
      unit = UNITS[u[1].toLowerCase()];
      rest = rest.slice(u[0].length);
      const s = /^\(([^)]*)\)\s*/.exec(rest);
      if (s) {
        size = s[1].trim();
        rest = rest.slice(s[0].length);
      }
    }
  }

  let link: string | null = null;
  const l = /^\[([^\]]+)\]\(([^)]+)\)\s*/.exec(rest);
  let name: string;
  let note: string | null = null;
  if (l) {
    name = l[1].trim();
    link = l[2].trim();
    const after = rest.slice(l[0].length).replace(/^,\s*/, '').trim();
    note = after || null;
  } else {
    const comma = topLevelComma(rest);
    name = (comma === -1 ? rest : rest.slice(0, comma)).trim();
    note = comma === -1 ? null : rest.slice(comma + 1).trim() || null;
  }
  return { raw: text, line, quantity, unit, size, name, note, optional, link, group };
}

export function parseIngredientSection(lines: Line[]): Ingredient[] {
  const out: Ingredient[] = [];
  let group: string | null = null;
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    const h = /^###\s+(.+)$/.exec(t);
    if (h) {
      group = h[1].trim();
      continue;
    }
    const m = /^[-*]\s+(.*)$/.exec(t);
    out.push(parseIngredientLine(m ? m[1] : t, l.line, group));
  }
  return out;
}

function formatNumber(x: number): string {
  const whole = Math.floor(x);
  const frac = Math.round((x - whole) * 100) / 100;
  const f = ({ 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾' } as Record<number, string>)[frac];
  return f ? (whole ? `${whole}${f}` : f) : String(Math.round(x * 100) / 100);
}

/** "1½ cups", "2–4", "1 jar (23 oz)". */
export function formatQuantity(quantity: Quantity, unit: string | null, size: string | null = null): string {
  const q = quantity.min === quantity.max ? formatNumber(quantity.min) : `${formatNumber(quantity.min)}–${formatNumber(quantity.max)}`;
  const plural = quantity.max > 1 && unit && !['oz', 'lb', 'g', 'ml', 'tsp', 'tbsp', 'loaf'].includes(unit);
  const u = unit ? ` ${unit}${plural ? (/(ch|sh|x)$/.test(unit) ? 'es' : 's') : ''}` : '';
  return `${q}${u}${size ? ` (${size})` : ''}`;
}

// ---------------------------------------------------------------------------
// Catalog

/** Aisles in the order we walk the store; the shopping list is grouped in this order. */
export const AISLES = [
  'Produce',
  'Seafood',
  'Meat & Poultry',
  'Dairy & Eggs',
  'Refrigerated',
  'Frozen',
  'Bakery',
  'Grains & Pasta',
  'Canned & Jarred',
  'Pantry',
  'Spices & Condiments',
] as const;
export type Aisle = (typeof AISLES)[number];

export type IngredientKind = 'key' | 'staple' | null;

export interface CatalogEntry {
  name: string;
  aisle: Aisle;
  /** `key` ingredients define a dish and count toward variety checks; `staple`s stay off the shopping list. */
  kind: IngredientKind;
  buyAs: string | null;
  aliases: string[];
  line: number;
}

export interface Catalog {
  entries: CatalogEntry[];
  /** Normalized name or alias → entry. */
  index: Map<string, CatalogEntry>;
}

export function parseCatalog(text: string, file = 'protocols/ingredients.md'): { catalog: Catalog; issues: IssueList } {
  const issues = new IssueList(file);
  const entries: CatalogEntry[] = [];
  const index = new Map<string, CatalogEntry>();
  const rows = text.split(/\r?\n/).map((t, i) => ({ t: t.trim(), line: i + 1 }));
  let header: string[] | null = null;

  for (const { t, line } of rows) {
    if (!t.startsWith('|')) {
      header = null;
      continue;
    }
    const cells = t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (!header) {
      header = cells.map((c) => c.toLowerCase());
      continue;
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const get = (col: string) => {
      const i = header!.indexOf(col);
      return i === -1 ? '' : (cells[i] ?? '');
    };
    const name = get('ingredient');
    if (!name) {
      issues.error('Row has no ingredient name', line);
      continue;
    }
    const aisle = get('aisle') as Aisle;
    if (!AISLES.includes(aisle)) {
      issues.error(`"${name}": unknown aisle "${aisle}" (use one of: ${AISLES.join(', ')})`, line);
      continue;
    }
    const kindText = get('kind').toLowerCase();
    if (kindText && kindText !== 'key' && kindText !== 'staple') {
      issues.error(`"${name}": kind must be "key", "staple", or blank`, line);
    }
    const entry: CatalogEntry = {
      name,
      aisle,
      kind: kindText === 'key' || kindText === 'staple' ? kindText : null,
      buyAs: get('buy as') || null,
      aliases: get('also called').split(',').map((a) => a.trim()).filter(Boolean),
      line,
    };
    entries.push(entry);
    for (const n of [entry.name, ...entry.aliases]) {
      const key = normalizeName(n);
      const existing = index.get(key);
      if (existing && existing !== entry) {
        issues.error(`"${n}" is listed for both "${existing.name}" and "${entry.name}"`, line);
      } else {
        index.set(key, entry);
      }
    }
  }
  return { catalog: { entries, index }, issues };
}

function singular(word: string): string {
  if (/(ss|us|is)$/.test(word) || word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9&\- ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ');
}

/**
 * Exact match on name or alias first, then the longest catalog name the ingredient ends with ("large sweet potatoes").
 * For a choice like "spinach or kale", the first option is the default and is tried first.
 */
export function matchIngredient(catalog: Catalog, name: string): CatalogEntry | undefined {
  const n = normalizeName(name);
  const candidates = n.includes(' or ') ? [n.split(' or ')[0], n] : [n];
  for (const c of candidates) {
    const words = c.split(' ');
    for (let i = 0; i < words.length; i++) {
      const hit = catalog.index.get(words.slice(i).join(' '));
      if (hit) return hit;
    }
  }
  return undefined;
}
