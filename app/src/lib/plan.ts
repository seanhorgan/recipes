// Weekly plans (YYYY/Month/YYYY-MM-DD.md). Format: reference/schema.md
import { parseDocument, resolveLink, type Line } from './markdown.ts';
import { IssueList } from './issues.ts';
import { DAYS, addDays, isIsoDate, planPath, weekdayIndex, type Day } from './dates.ts';

export interface PlanDay {
  day: Day;
  date: string;
  /** Repo-relative recipe path when the heading links a recipe. */
  recipePath: string | null;
  /** Link text, or the plain heading text for a night off. */
  label: string;
  cook: string | null;
  notes: string[];
  line: number;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
  claimedBy: string | null;
  line: number;
}

export interface ShoppingGroup {
  aisle: string;
  items: ChecklistItem[];
}

export interface Plan {
  path: string;
  monday: string;
  title: string;
  days: PlanDay[];
  sundayPrep: ChecklistItem[];
  shopping: ShoppingGroup[];
}

const PATH_RE = /^(\d{4})\/([A-Za-z]+)\/(\d{4}-\d{2}-\d{2})\.md$/;

export function isPlanPath(path: string): boolean {
  return PATH_RE.test(path);
}

export function parseChecklistItem(text: string, line: number): ChecklistItem | null {
  const m = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(text.trim());
  if (!m) return null;
  const claim = /^(.*?)\s+—\s+([^—]+)$/.exec(m[2]);
  return {
    text: (claim ? claim[1] : m[2]).trim(),
    done: m[1] !== ' ',
    claimedBy: claim ? claim[2].trim() : null,
    line,
  };
}

/**
 * What makes two Sunday Prep steps "the same": the text without its "(Recipe name)" label, trailing storage
 * sentences ("Refrigerate."), case, or punctuation. "Cook the quinoa. Refrigerate." matches "Cook the quinoa."
 */
export function prepStepKey(text: string, withLabel = false): string {
  const step = withLabel ? text.replace(/\s*\([^()]*\)\s*$/, '') : text;
  return step
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/^(refrigerate|chill|cool|store|keep)\b/i.test(sentence.trim()))
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9°]+/g, ' ')
    .trim();
}

export function formatChecklistItem(item: Pick<ChecklistItem, 'text' | 'done' | 'claimedBy'>): string {
  return `- [${item.done ? 'x' : ' '}] ${item.text}${item.claimedBy ? ` — ${item.claimedBy}` : ''}`;
}

function parseChecklist(lines: Line[], issues: IssueList, withAisles: boolean): ShoppingGroup[] {
  const groups: ShoppingGroup[] = [];
  let current: ShoppingGroup | null = null;
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    const h = /^###\s+(.+)$/.exec(t);
    if (h && withAisles) {
      current = { aisle: h[1].trim(), items: [] };
      groups.push(current);
      continue;
    }
    if (/^[*_].*[*_]$/.test(t)) continue; // italic remark such as "*Following reference/shopping.md*"
    const item = parseChecklistItem(t, l.line);
    if (!item) {
      issues.warn(`Expected a checklist item like "- [ ] text", got "${t}"`, l.line);
      continue;
    }
    if (!current) {
      current = { aisle: 'Other', items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

export function parsePlan(path: string, text: string): { plan: Plan; issues: IssueList } {
  const issues = new IssueList(path);
  const m = PATH_RE.exec(path);
  const monday = m?.[3] ?? '';
  if (!m || !isIsoDate(monday)) {
    issues.error('Plan files are named YYYY/Month/YYYY-MM-DD.md');
  } else if (weekdayIndex(monday) !== 0) {
    issues.error(`${monday} is not a Monday; name the plan after the Monday of its week`);
  } else if (planPath(monday) !== path) {
    issues.error(`This plan belongs at ${planPath(monday)}`);
  }

  const doc = parseDocument(text);
  if (doc.frontmatterError) issues.error(doc.frontmatterError, 1);
  if (!doc.title) issues.error('Missing the "# Week of ..." title line');

  const plan: Plan = { path, monday, title: doc.title ?? '', days: [], sundayPrep: [], shopping: [] };
  let lastDay = -1;
  for (const s of doc.sections) {
    if (s.heading === 'Sunday Prep') {
      plan.sundayPrep = parseChecklist(s.lines, issues, false).flatMap((g) => g.items);
      const seen = new Map<string, number>();
      for (const item of plan.sundayPrep) {
        const key = prepStepKey(item.text, true);
        const first = seen.get(key);
        if (first === undefined) seen.set(key, item.line);
        else issues.warn(`Same Sunday Prep step as line ${first}; merge them into one line naming both recipes`, item.line);
      }
      continue;
    }
    if (s.heading === 'Shopping List') {
      plan.shopping = parseChecklist(s.lines, issues, true);
      continue;
    }
    const d = /^([A-Za-z]+)(?::\s*(.*))?$/.exec(s.heading);
    const dayIdx = d ? DAYS.indexOf(d[1] as Day) : -1;
    if (dayIdx === -1) {
      issues.warn(`Unknown section "## ${s.heading}" (expected a day, "Sunday Prep", or "Shopping List")`, s.line);
      continue;
    }
    if (dayIdx <= lastDay) issues.error(`${DAYS[dayIdx]} is repeated or out of order`, s.line);
    lastDay = Math.max(lastDay, dayIdx);

    const rest = (d![2] ?? '').trim();
    const link = /^\[([^\]]+)\]\(([^)]+)\)\s*(.*)$/.exec(rest);
    if (!rest) issues.warn(`${DAYS[dayIdx]} has no dinner; write "## ${DAYS[dayIdx]}: <recipe link or plan>"`, s.line);

    const day: PlanDay = {
      day: DAYS[dayIdx],
      date: monday && isIsoDate(monday) ? addDays(monday, dayIdx) : '',
      recipePath: link ? resolveLink(path, link[2]) : null,
      label: link ? link[1].trim() : rest,
      cook: null,
      notes: [],
      line: s.line,
    };
    if (link?.[3]) day.notes.push(link[3]);
    for (const l of s.lines) {
      const t = l.text.trim();
      if (!t) continue;
      const cook = /^cook:\s*(.*)$/i.exec(t);
      if (cook) day.cook = cook[1].trim() || null;
      else day.notes.push(t);
    }
    plan.days.push(day);
  }
  return { plan, issues };
}
