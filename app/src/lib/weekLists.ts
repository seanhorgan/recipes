// Builds a week's Sunday Prep checklist and consolidated Shopping List from its recipes,
// following reference/shopping.md, and writes them into a plan file.
import { AISLES, formatQuantity, matchIngredient, type Catalog, type CatalogEntry, type Ingredient } from './ingredients.ts';
import { parseDocument, relativeLink, resolveLink } from './markdown.ts';
import { parseChecklistItem, formatChecklistItem, parsePlan, prepStepKey, type Plan } from './plan.ts';
import { DAYS, formatLong, planPath } from './dates.ts';
import type { Recipe } from './recipe.ts';

export interface WeekLists {
  sundayPrep: string[];
  shopping: { aisle: string; items: string[] }[];
  /** Staples the week uses; not on the list, but worth a pantry check. */
  pantry: string[];
}

interface Tally {
  entry: CatalogEntry | null;
  name: string;
  /** unit ('' for plain counts) → [min, max] */
  amounts: Map<string, [number, number]>;
  unmeasured: boolean;
}

function planRecipes(plan: Plan, recipes: Map<string, Recipe>): Recipe[] {
  return plan.days.map((d) => (d.recipePath ? recipes.get(d.recipePath) : undefined)).filter((r): r is Recipe => !!r);
}

/** Every (ingredient, multiplier) the week needs, with linked sauces expanded. Optional ingredients are skipped. */
function expand(recipe: Recipe, sauces: Map<string, Recipe>): { ing: Ingredient; times: number }[] {
  const out: { ing: Ingredient; times: number }[] = [];
  for (const ing of recipe.ingredients) {
    if (ing.optional) continue;
    const sauce = ing.link ? sauces.get(resolveLink(recipe.path, ing.link)) : undefined;
    if (sauce) {
      const batches = ing.unit === 'batch' && ing.quantity ? ing.quantity.max : 1;
      for (const s of sauce.ingredients) if (!s.optional) out.push({ ing: s, times: batches });
    } else {
      out.push({ ing, times: 1 });
    }
  }
  return out;
}

export function buildWeekLists(
  plan: Plan,
  recipes: Map<string, Recipe>,
  sauces: Map<string, Recipe>,
  catalog: Catalog,
): WeekLists {
  const week = planRecipes(plan, recipes);

  // Sunday prep: each recipe's steps in dinner order, with matching steps (like "Cook the quinoa." and
  // "Cook the quinoa. Refrigerate.") merged into one line that keeps the fuller wording; then one line per sauce.
  const steps = new Map<string, { text: string; titles: string[] }>();
  const sauceUsers = new Map<string, { sauce: Recipe; users: string[] }>();
  for (const r of week) {
    for (const step of r.sundayPrep) {
      const key = prepStepKey(step.text);
      const entry = steps.get(key) ?? { text: step.text, titles: [] };
      if (step.text.length > entry.text.length) entry.text = step.text;
      if (!entry.titles.includes(r.title)) entry.titles.push(r.title);
      steps.set(key, entry);
    }
    for (const ing of r.ingredients) {
      const sauce = ing.link ? sauces.get(resolveLink(r.path, ing.link)) : undefined;
      if (!sauce || ing.optional) continue;
      const entry = sauceUsers.get(sauce.path) ?? { sauce, users: [] };
      if (!entry.users.includes(r.title)) entry.users.push(r.title);
      sauceUsers.set(sauce.path, entry);
    }
  }
  const sundayPrep = [...steps.values()].map(({ text, titles }) => `${text} (${titles.join(', ')})`);
  for (const { sauce, users } of sauceUsers.values()) {
    sundayPrep.push(`Make the ${sauce.title} (for ${users.join(', ')})`);
  }

  // Shopping: merge by catalog entry, summing quantities that share a unit.
  const tallies = new Map<string, Tally>();
  for (const r of week) {
    for (const { ing, times } of expand(r, sauces)) {
      const entry = matchIngredient(catalog, ing.name) ?? null;
      const key = entry ? entry.name : ing.name.toLowerCase();
      const t = tallies.get(key) ?? { entry, name: entry?.name ?? ing.name, amounts: new Map(), unmeasured: false };
      if (ing.quantity) {
        const unit = ing.unit ?? '';
        const [min, max] = t.amounts.get(unit) ?? [0, 0];
        t.amounts.set(unit, [min + ing.quantity.min * times, max + ing.quantity.max * times]);
      } else {
        t.unmeasured = true;
      }
      tallies.set(key, t);
    }
  }

  const pantry: string[] = [];
  const byAisle = new Map<string, string[]>();
  for (const t of [...tallies.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    if (t.entry?.kind === 'staple') {
      pantry.push(t.name);
      continue;
    }
    const amounts = [...t.amounts].map(([unit, [min, max]]) => formatQuantity({ min, max }, unit || null));
    const text =
      t.name +
      (amounts.length ? ` (${amounts.join(' + ')})` : '') +
      (t.entry?.buyAs ? ` · ${t.entry.buyAs}` : '');
    const aisle = t.entry?.aisle ?? 'Other';
    byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), text]);
  }
  const order = [...AISLES, 'Other'];
  const shopping = [...byAisle]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([aisle, items]) => ({ aisle, items }));

  return { sundayPrep, shopping, pantry };
}

/**
 * Replaces (or appends) the plan's `## Sunday Prep` and `## Shopping List` sections with freshly built lists.
 * Items whose text is unchanged keep their checked state and claim, as recorded in `previousText`
 * (by default the plan itself).
 */
export function writeWeekLists(planText: string, lists: WeekLists, previousText: string = planText): string {
  const previous = new Map<string, { done: boolean; claimedBy: string | null }>();
  for (const line of previousText.split('\n')) {
    const item = parseChecklistItem(line, 0);
    if (item) previous.set(item.text, { done: item.done, claimedBy: item.claimedBy });
  }
  const item = (text: string) => formatChecklistItem({ text, ...(previous.get(text) ?? { done: false, claimedBy: null }) });

  const prep = ['## Sunday Prep', ...lists.sundayPrep.map(item)];
  const shopping = ['## Shopping List'];
  for (const g of lists.shopping) shopping.push(`### ${g.aisle}`, ...g.items.map(item));
  if (lists.pantry.length) shopping.push('', `*Check the pantry: ${lists.pantry.join(', ')}.*`);

  // Drop the old generated sections, keep everything else (title, days, notes) as written.
  const doc = parseDocument(planText);
  const lines = planText.replace(/\r\n?/g, '\n').split('\n');
  const drop = new Set<number>();
  for (const s of doc.sections) {
    if (s.heading !== 'Sunday Prep' && s.heading !== 'Shopping List') continue;
    drop.add(s.line);
    for (const l of s.lines) drop.add(l.line);
  }
  const kept = lines.filter((_, i) => !drop.has(i + 1)).join('\n').trimEnd();
  const blocks = [kept, lists.sundayPrep.length ? prep.join('\n') : '', shopping.length > 1 ? shopping.join('\n') : ''];
  return blocks.filter(Boolean).join('\n\n') + '\n';
}

/** One night in a plan being written (by the app's planner or the `plan new` script). */
export interface DraftDay {
  /** 0 = Monday … 6 = Sunday */
  day: number;
  recipePath: string | null;
  /** Plain text for a night without a recipe, e.g. "Pizza night". */
  label: string;
  cook: string | null;
  notes: string[];
}

/** The title and day sections of a plan file, before the Sunday Prep and Shopping List are added. */
export function renderPlanDays(monday: string, days: DraftDay[], recipes: Map<string, Recipe>): string {
  const path = planPath(monday);
  const lines = [`# Week of ${formatLong(monday)}`, ''];
  for (const d of [...days].sort((a, b) => a.day - b.day)) {
    const recipe = d.recipePath ? recipes.get(d.recipePath) : undefined;
    lines.push(
      recipe
        ? `## ${DAYS[d.day]}: [${recipe.title}](${relativeLink(path, recipe.path)})`
        : `## ${DAYS[d.day]}: ${d.label.trim() || 'Night off'}`,
    );
    if (d.cook) lines.push(`Cook: ${d.cook}`);
    lines.push(...d.notes);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * The complete plan file for a week: day sections, Sunday Prep, and Shopping List.
 * Checked items and claims carry over from `previousText` (the current file, if any).
 */
export function buildPlanText(
  monday: string,
  days: DraftDay[],
  recipes: Map<string, Recipe>,
  sauces: Map<string, Recipe>,
  catalog: Catalog,
  previousText: string | null = null,
): string {
  const daysText = renderPlanDays(monday, days, recipes);
  const { plan } = parsePlan(planPath(monday), daysText);
  return writeWeekLists(daysText, buildWeekLists(plan, recipes, sauces, catalog), previousText ?? daysText);
}
