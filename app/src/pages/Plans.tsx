import { repo, history, todayIso } from '../data.ts';
import { formatLong } from '../lib/dates.ts';
import type { Plan } from '../lib/plan.ts';
import { PROTEINS } from '../lib/recipe.ts';
import { varietyReport } from '../lib/variety.ts';
import { Chip, GitHubLinks, PROTEIN_LABEL, Section, shortDate, routeFor } from '../ui.tsx';
import { href } from '../router.ts';

export function PlanList() {
  const plans = [...repo.plans].reverse();
  return (
    <>
      <h1>Weekly plans</h1>
      <ul className="card-list">
        {plans.map((p) => (
          <li key={p.path}>
            <a className="card" href={href('plans', p.monday)}>
              <span className="card-title">Week of {formatLong(p.monday)}</span>
              <span className="card-sub muted">{p.days.map((d) => d.label).join(' · ')}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function VarietyCheck({ plan }: { plan: Plan }) {
  const v = varietyReport(plan, repo.recipes, repo.catalog, history);
  const mix = PROTEINS.filter((p) => v.proteins[p] > 0);
  const flags = [
    ...v.repeatedKeys.map((k) => `${k.ingredient} in ${k.recipes.length} dinners (${k.recipes.join(', ')})`),
    ...v.repeatedTags.map((t) => `${t.recipes.length} ${t.tag} dinners (${t.recipes.join(', ')})`),
    ...v.recentRepeats.map((r) => `${r.recipe} was also on the menu ${shortDate(r.lastDate)}`),
  ];
  return (
    <Section title="Variety check">
      <div className="chip-row">
        {mix.map((p) => <Chip key={p}>{PROTEIN_LABEL[p]} × {v.proteins[p]}</Chip>)}
      </div>
      {flags.length ? (
        <ul className="bullets warn-list">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
      ) : (
        <p className="muted">No repeated key ingredients, dish styles, or recent repeats. 👍</p>
      )}
    </Section>
  );
}

export function PlanView({ plan, heading }: { plan: Plan; heading?: string }) {
  const today = todayIso();
  const prepDone = plan.sundayPrep.filter((i) => i.done).length;
  const shopItems = plan.shopping.flatMap((g) => g.items);
  const shopDone = shopItems.filter((i) => i.done).length;

  return (
    <>
      <h1>{heading ?? `Week of ${formatLong(plan.monday)}`}</h1>
      {heading && <p className="lede">Week of {formatLong(plan.monday)}</p>}
      <ol className="week">
        {plan.days.map((d) => {
          const recipe = d.recipePath ? repo.recipes.get(d.recipePath) : undefined;
          const isToday = d.date === today;
          return (
            <li key={d.day} className={`day${isToday ? ' today' : ''}`}>
              <div className="day-name">
                {d.day.slice(0, 3)}
                <span className="muted">{shortDate(d.date).slice(4)}</span>
              </div>
              <div className="day-body">
                {recipe ? (
                  <a className="day-title" href={routeFor(recipe.path)!}>{recipe.title}</a>
                ) : (
                  <span className="day-title">{d.label || '—'}</span>
                )}
                <span className="card-meta">
                  {isToday && <Chip tone="accent">Tonight</Chip>}
                  {recipe?.protein && <span>{PROTEIN_LABEL[recipe.protein]}</span>}
                  {recipe && <span>⏱ {recipe.weeknightMinutes} min</span>}
                  {d.cook && <span>👩‍🍳 {d.cook}</span>}
                </span>
                {d.notes.map((n) => <span key={n} className="muted day-note">{n}</span>)}
              </div>
            </li>
          );
        })}
      </ol>

      <VarietyCheck plan={plan} />

      {plan.sundayPrep.length > 0 && (
        <Section title={`Sunday Prep · ${prepDone}/${plan.sundayPrep.length} done`}>
          <ul className="checklist">
            {plan.sundayPrep.map((i) => (
              <li key={i.line} className={i.done ? 'done' : ''}>
                <input type="checkbox" checked={i.done} disabled aria-label={i.text} /> {i.text}
                {i.claimedBy && <span className="muted"> — {i.claimedBy}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {shopItems.length > 0 && (
        <Section title={`Shopping list · ${shopDone}/${shopItems.length} checked`}>
          {plan.shopping.map((g) => (
            <div key={g.aisle}>
              {(plan.shopping.length > 1 || g.aisle !== 'Other') && <h3>{g.aisle}</h3>}
              <ul className="checklist">
                {g.items.map((i) => (
                  <li key={i.line} className={i.done ? 'done' : ''}>
                    <input type="checkbox" checked={i.done} disabled aria-label={i.text} /> {i.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      <GitHubLinks path={plan.path} />
    </>
  );
}

export function PlanDetail({ plan }: { plan: Plan }) {
  return (
    <article>
      <p className="back"><a href={href('plans')}>← Weekly plans</a></p>
      <PlanView plan={plan} />
    </article>
  );
}
