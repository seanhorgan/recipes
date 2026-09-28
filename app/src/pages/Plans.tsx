import { useState, type CSSProperties } from 'react';
import { repo, history, todayIso } from '../data.ts';
import { edit, useSync } from '../sync.ts';
import { updateChecklistItem, type ChecklistItem, type Plan } from '../lib/plan.ts';
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
    <div className="variety small muted">
      <span>Variety: {mix.map((p) => `${PROTEIN_LABEL[p]} × ${v.proteins[p]}`).join(' · ')}</span>
      {flags.length ? (
        <ul className="bullets warn-list">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
      ) : (
        <span> · no repeated key ingredients, dish styles, or recent repeats 👍</span>
      )}
    </div>
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
      <ol className="week week-calendar" style={{ '--days': plan.days.length } as CSSProperties}>
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
          <p className="muted small">Already have something at home? Check it off so it's not copied.</p>
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
  const short = (item: ChecklistItem) => item.text.replace(/ · .*$/, '').replace(/\s*\([^()]*\)\s*$/, '');
  const toggle = (item: ChecklistItem, done: boolean) =>
    edit(plan.path, {
      apply: (text) => updateChecklistItem(text ?? '', section, item.text, { done }),
      describe: `${done ? 'check' : 'uncheck'} ${short(item)}`,
    });
  const claim = (item: ChecklistItem, claimedBy: string | null) =>
    edit(plan.path, {
      apply: (text) => updateChecklistItem(text ?? '', section, item.text, { claimedBy }),
      describe: claimedBy ? `${claimedBy} takes ${short(item)}` : `unclaim ${short(item)}`,
    });
  const me = sync.name;
  return (
    <ul className="checklist">
      {items.map((i) => (
        <li key={`${i.line}:${i.text}`} className={i.done ? 'done' : ''}>
          <label>
            <input type="checkbox" checked={i.done} disabled={!sync.connected} onChange={(e) => toggle(i, e.target.checked)} />
            <span>{i.text}</span>
          </label>
          {section === 'Sunday Prep' && (sync.connected && me && !i.done ? (
            <button
              className={`toggle small claim${i.claimedBy ? ' on' : ''}`}
              onClick={() => claim(i, i.claimedBy === me ? null : me)}
              title={i.claimedBy && i.claimedBy !== me ? `Take over from ${i.claimedBy}` : undefined}
            >
              {i.claimedBy === me ? `Mine (${me})` : i.claimedBy ? `${i.claimedBy}'s` : "I'll do it"}
            </button>
          ) : i.claimedBy ? (
            <span className="muted small claim">{i.claimedBy}</span>
          ) : null)}
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
