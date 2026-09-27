// A one-page markdown summary of everything an agent needs to plan a week: recent plans, and every recipe
// with its protein, style, times, rating, last-cooked date, and key ingredients.
import { matchIngredient } from './ingredients.ts';
import { cookHistory, type Repo } from './repo.ts';
import { currentRating } from './recipe.ts';
import { addDays, formatLong, mondayOf, planPath } from './dates.ts';

export function agentContext(repo: Repo, today: string): string {
  const history = cookHistory(repo.plans);
  // On Sunday that's tomorrow; any other day, the coming Monday.
  const monday = mondayOf(addDays(today, 1));
  const nextMonday = monday > today ? monday : addDays(monday, 7);
  const recentCutoff = addDays(nextMonday, -28);
  const out: string[] = [];

  out.push(
    '# Meal planning context',
    '',
    `Generated ${today} from the recipes repo (https://github.com/seanhorgan/recipes). Follow skills/plan-week/SKILL.md.`,
    '',
    `- **Next week to plan:** week of ${formatLong(nextMonday)} → \`${planPath(nextMonday)}\`` +
      (repo.plans.some((p) => p.monday === nextMonday) ? ' (a plan already exists; update it rather than replace it)' : ''),
    `  (Worked out on ${today}. If today is later than that, plan the week starting the Monday after today instead.)`,
    `- **"Recent" means** cooked on or after ${recentCutoff} (4 weeks before that Monday). Avoid recent recipes.`,
    '',
    '## Recent weeks',
    '',
  );
  const recent = repo.plans.filter((p) => p.monday < nextMonday).slice(-4).reverse();
  if (!recent.length) out.push('_No earlier plans._');
  for (const p of recent) {
    out.push(`- **Week of ${formatLong(p.monday)}:** ` + p.days.map((d) => `${d.day.slice(0, 3)} ${d.label}`).join('; '));
  }

  const rows = [...repo.recipes.values()].map((r) => {
    const dates = (history.get(r.path) ?? []).filter((d) => d < nextMonday);
    const keys = [
      ...new Set(
        r.ingredients
          .filter((i) => !i.optional && !i.link)
          .map((i) => matchIngredient(repo.catalog, i.name))
          .filter((e) => e?.kind === 'key')
          .map((e) => e!.name.toLowerCase()),
      ),
    ];
    return { r, last: dates.at(-1) ?? '', times: dates.length, keys, stars: currentRating(r)?.stars ?? 0 };
  });
  rows.sort((a, b) => a.last.localeCompare(b.last) || b.stars - a.stars || a.r.title.localeCompare(b.r.title));

  out.push(
    '',
    `## Recipes (${rows.length}), longest since cooked first`,
    '',
    'Link a recipe in a plan as `../../recipes/<slug>.md`.',
    '',
    '| Recipe | Slug | Protein | Style | Weeknight min | Prep min | Rating | Last cooked | Times | Key ingredients |',
    '|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const { r, last, times, keys, stars } of rows) {
    const recentFlag = last >= recentCutoff ? ' ⚠ recent' : '';
    out.push(
      `| ${r.title.replace(/\|/g, '/')} | ${r.slug} | ${r.protein ?? ''} | ${r.tags.join(', ')} | ${r.weeknightMinutes ?? ''} | ` +
        `${r.prepMinutes} | ${stars ? '★'.repeat(stars) : '–'} | ${last ? last + recentFlag : 'never'} | ${times} | ${keys.join(', ')} |`,
    );
  }

  out.push('', '## Sauces', '');
  for (const s of repo.sauces.values()) out.push(`- ${s.title}: \`../sauces/${s.slug}.md\` (link from a recipe's ingredients)`);
  out.push('');
  return out.join('\n');
}
