import { repo, currentPlan, focusMonday, latestPlan, recipeStats, todayIso, daysBetween } from '../data.ts';
import { currentRating } from '../lib/recipe.ts';
import { formatLong } from '../lib/dates.ts';
import { PlanView } from './Plans.tsx';
import { useSync } from '../sync.ts';
import { PROTEIN_LABEL, RecipeRating, Section, ago, routeFor } from '../ui.tsx';
import { href } from '../router.ts';

/** Well-rated recipes that haven't been on the menu for 4+ weeks: good picks for variety. */
function Comebacks({ today }: { today: string }) {
  const picks = [...repo.recipes.values()]
    .map((r) => ({ r, stats: recipeStats(r, today), stars: currentRating(r)?.stars ?? 0 }))
    .filter(({ stats }) => !stats.next && (!stats.last || daysBetween(stats.last, today) >= 28))
    .sort((a, b) => b.stars - a.stars || (a.stats.last ?? '').localeCompare(b.stats.last ?? ''))
    .slice(0, 6);
  return (
    <Section title="Due for a comeback">
      <p className="muted">Top-rated dinners you haven't had in at least 4 weeks.</p>
      <ul className="card-list">
        {picks.map(({ r, stats }) => (
          <li key={r.path}>
            <a className="card recipe-card" href={routeFor(r.path)!}>
              <span className="card-title">{r.title}</span>
              <span className="card-meta">
                {r.protein && <span>{PROTEIN_LABEL[r.protein]}</span>}
                <span>⏱ {r.weeknightMinutes} min</span>
                <RecipeRating recipe={r} />
              </span>
              <span className="card-sub muted">{stats.last ? `Last cooked ${ago(stats.last, today)}` : 'Never planned'}</span>
            </a>
          </li>
        ))}
      </ul>
      <p><a href={href('recipes')}>Browse all {repo.recipes.size} recipes →</a></p>
    </Section>
  );
}

export function Home() {
  const today = todayIso();
  const sync = useSync();
  const monday = focusMonday(today);
  const plan = currentPlan(today);
  const latest = latestPlan();
  const heading = !plan ? '' : plan.monday <= today ? 'This week' : plan.monday === monday ? 'Next week' : 'Coming up';

  return (
    <>
      {plan ? (
        <PlanView plan={plan} heading={heading} />
      ) : (
        <>
          <h1>This week</h1>
          <div className="callout">
            <p><strong>No plan yet for the week of {formatLong(monday)}.</strong></p>
            {sync.connected ? (
              <p><a className="button primary" href={href('plan', monday)}>Plan the week</a></p>
            ) : (
              <p>
                <a href={href('settings')}>Connect this device</a> to plan it here, or ask an agent to plan it (it
                follows <code>SKILLS.md</code>).
              </p>
            )}
            {latest && (
              <p>Most recent plan: <a href={href('plans', latest.monday)}>week of {formatLong(latest.monday)}</a></p>
            )}
          </div>
        </>
      )}
      <Comebacks today={today} />
    </>
  );
}
