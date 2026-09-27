import { useState } from 'react';
import { repo, history, todayIso } from '../data.ts';
import { edit, useSync } from '../sync.ts';
import { setChecklistItem, type ChecklistItem, type Plan } from '../lib/plan.ts';
import { formatLong } from '../lib/dates.ts';
import { PROTEINS } from '../lib/recipe.ts';
import { varietyReport } from '../lib/variety.ts';
import { Chip, GitHubLinks, PROTEIN_LABEL, Section, shortDate, routeFor } from '../ui.tsx';
import { href } from '../router.ts';

export function PlanList() {
  const plans = [...repo.plans].reverse();
  const sync = useSync();
  return (
    <>
      <div className="title-row">
        <h1>Weekly plans</h1>
        {sync.connected && <a className="button primary" href={href('plan')}>Plan a week</a>}
      </div>
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
      <div className="title-row">
        <h1>{heading ?? `Week of ${formatLong(plan.monday)}`}</h1>
        <EditPlanLink monday={plan.monday} />
      </div>
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
          <Checklist plan={plan} section="Sunday Prep" items={plan.sundayPrep} />
        </Section>
      )}

      {shopItems.length > 0 && (
        <Section title={`Shopping list · ${shopDone}/${shopItems.length} checked`}>
          <CopyForInstacart plan={plan} />
          {plan.shopping.map((g) => (
            <div key={g.aisle}>
              {(plan.shopping.length > 1 || g.aisle !== 'Other') && <h3>{g.aisle}</h3>}
              <Checklist plan={plan} section="Shopping List" items={g.items} />
            </div>
          ))}
        </Section>
      )}

      <GitHubLinks path={plan.path} />
    </>
  );
}

/** Checkboxes save straight to the plan file on a connected device; read-only otherwise. */
function Checklist({ plan, section, items }: { plan: Plan; section: 'Sunday Prep' | 'Shopping List'; items: ChecklistItem[] }) {
  const sync = useSync();
  const toggle = (item: ChecklistItem, done: boolean) =>
    edit(plan.path, {
      apply: (text) => setChecklistItem(text ?? '', section, item.text, done),
      describe: `${done ? 'check' : 'uncheck'} ${item.text.replace(/ · .*$/, '')}`,
    });
  return (
    <ul className="checklist">
      {items.map((i) => (
        <li key={`${i.line}:${i.text}`} className={i.done ? 'done' : ''}>
          <label>
            <input type="checkbox" checked={i.done} disabled={!sync.connected} onChange={(e) => toggle(i, e.target.checked)} />
            <span>
              {i.text}
              {i.claimedBy && <span className="muted"> — {i.claimedBy}</span>}
            </span>
          </label>
        </li>
      ))}
      {!sync.connected && section === 'Sunday Prep' && (
        <li className="muted hint"><a href={href('settings')}>Connect this device</a> to check items off.</li>
      )}
    </ul>
  );
}

function CopyForInstacart({ plan }: { plan: Plan }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async () => {
    const lines = plan.shopping.flatMap((g) => g.items.filter((i) => !i.done).map((i) => i.text.replace(' · ', ' — ')));
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(`Copied ${lines.length} item${lines.length === 1 ? '' : 's'}`);
    } catch {
      setCopied("Couldn't copy on this device");
    }
    setTimeout(() => setCopied(null), 2500);
  };
  return (
    <p className="row">
      <button className="button" onClick={copy}>Copy for Instacart</button>
      <span className="muted" role="status">{copied ?? 'Unchecked items, one per line'}</span>
    </p>
  );
}

function EditPlanLink({ monday }: { monday: string }) {
  const sync = useSync();
  return sync.connected ? <a className="button" href={href('plan', monday)}>Edit plan</a> : null;
}

export function PlanDetail({ plan }: { plan: Plan }) {
  return (
    <article>
      <p className="back"><a href={href('plans')}>← Weekly plans</a></p>
      <PlanView plan={plan} />
    </article>
  );
}
