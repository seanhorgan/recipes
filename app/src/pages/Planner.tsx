import { useEffect, useMemo, useRef, useState } from 'react';
import { repo, history, todayIso, focusMonday } from '../data.ts';
import { edit, save, useSync } from '../sync.ts';
import { DAYS, addDays, formatLong, isIsoDate, mondayOf, planPath } from '../lib/dates.ts';
import { parsePlan } from '../lib/plan.ts';
import { currentRating, PROTEINS } from '../lib/recipe.ts';
import { buildPlanText, buildWeekLists, renderPlanDays, type DraftDay } from '../lib/weekLists.ts';
import { varietyReport } from '../lib/variety.ts';
import { searchRecipes, searchTerms } from '../lib/search.ts';
import { Chip, PROTEIN_LABEL, Section, Stars, ago, shortDate } from '../ui.tsx';
import { hashQuery, href } from '../router.ts';
import { parsePlanLink, type LinkDraft } from '../lib/planLink.ts';
import { FAMILY_COOKS } from '../family.ts';

export function Planner({ monday: requested }: { monday?: string }) {
  const sync = useSync();
  const today = todayIso();
  const monday = requested && isIsoDate(requested) ? mondayOf(requested) : focusMonday(today);

  if (!sync.connected) {
    return (
      <>
        <h1>Plan a week</h1>
        <p className="callout">
          <a href={href('settings')}>Connect this device</a> to plan in the app{hashQuery() ? ', then open the plan link again' : ''}.
          Until then, ask an agent to plan the week (it follows <code>skills/plan-week</code>).
        </p>
      </>
    );
  }
  const query = hashQuery();
  return <PlannerForm key={`${monday}?${query}`} monday={monday} link={parsePlanLink(query, repo.recipes)} />;
}

function draftFromPlan(monday: string): DraftDay[] {
  const plan = repo.plans.find((p) => p.monday === monday);
  if (!plan) return [0, 1, 2, 3, 4].map((day) => ({ day, recipePath: null, label: '', cook: null, notes: [] }));
  return plan.days.map((d) => ({
    day: DAYS.indexOf(d.day),
    recipePath: d.recipePath,
    label: d.recipePath ? '' : d.label,
    cook: d.cook,
    notes: d.notes,
  }));
}

function PlannerForm({ monday, link }: { monday: string; link: LinkDraft | null }) {
  const existing = repo.plans.some((p) => p.monday === monday);
  const [days, setDays] = useState<DraftDay[]>(() => link?.days ?? draftFromPlan(monday));
  const [picking, setPicking] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDay = (day: number, patch: Partial<DraftDay>) =>
    setDays((ds) => ds.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  const missing = [0, 1, 2, 3, 4, 5, 6].filter((i) => !days.some((d) => d.day === i));
  const filled = days.filter((d) => d.recipePath || d.label.trim());

  // Preview what will be saved: variety, Sunday prep, and shopping list size.
  const preview = useMemo(() => {
    const text = renderPlanDays(monday, filled.map((d) => ({ ...d, notes: d.notes.filter((n) => n.trim()) })), repo.recipes);
    const { plan } = parsePlan(planPath(monday), text);
    const lists = buildWeekLists(plan, repo.recipes, repo.sauces, repo.catalog);
    const prepMinutes = filled.reduce((sum, d) => sum + (d.recipePath ? (repo.recipes.get(d.recipePath)?.prepMinutes ?? 0) : 0), 0);
    return {
      variety: varietyReport(plan, repo.recipes, repo.catalog, history),
      prepSteps: lists.sundayPrep.length,
      prepMinutes,
      shopping: lists.shopping.reduce((n, g) => n + g.items.length, 0),
    };
  }, [days, monday, repo]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const draft = filled.map((d) => ({ ...d, notes: d.notes.map((n) => n.trim()).filter(Boolean) }));
    edit(planPath(monday), {
      // Built against the latest version of the file at save time, so checked items carry over.
      apply: (previous) => buildPlanText(monday, draft, repo.recipes, repo.sauces, repo.catalog, previous),
      describe: `plan week of ${formatLong(monday)}`,
    });
    try {
      await save();
      window.location.hash = href('plans', monday);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const v = preview.variety;
  const flags = [
    ...v.repeatedKeys.map((k) => `${k.ingredient} in ${k.recipes.length} dinners`),
    ...v.repeatedTags.map((t) => `${t.recipes.length} ${t.tag} dinners`),
    ...v.recentRepeats.map((r) => `${r.recipe} was on the menu ${shortDate(r.lastDate)}`),
  ];

  return (
    <article>
      <p className="back"><a href={existing ? href('plans', monday) : href('plans')}>← {existing ? 'Back to the plan' : 'Weekly plans'}</a></p>
      <div className="title-row">
        <h1>{existing ? 'Edit plan' : 'Plan a week'}</h1>
      </div>
      <div className="week-switch">
        <a className="button" href={href('plan', addDays(monday, -7))} aria-label="Previous week">←</a>
        <span>Week of <strong>{formatLong(monday)}</strong></span>
        <a className="button" href={href('plan', addDays(monday, 7))} aria-label="Next week">→</a>
      </div>

      {link && (
        <div className="callout accent" role="status">
          <p><strong>Filled in from a link.</strong> Check the week, change anything you like, then save.
            {existing && ' This replaces the dinners in the saved plan; checked items stay checked.'}</p>
          {link.problems.length > 0 && <ul className="bullets warn-list">{link.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}
      <ol className="week">
        {[...days].sort((a, b) => a.day - b.day).map((d) => {
          const recipe = d.recipePath ? repo.recipes.get(d.recipePath) : undefined;
          const date = addDays(monday, d.day);
          return (
            <li key={d.day} className="day planner-day">
              <div className="day-name">
                {DAYS[d.day].slice(0, 3)}
                <span className="muted">{shortDate(date).slice(4)}</span>
              </div>
              <div className="day-body">
                <button className="pick" onClick={() => setPicking(d.day)}>
                  {recipe ? (
                    <>
                      <span className="day-title">{recipe.title}</span>
                      <span className="card-meta">
                        {recipe.protein && <span>{PROTEIN_LABEL[recipe.protein]}</span>}
                        <span>⏱ {recipe.weeknightMinutes} min</span>
                      </span>
                    </>
                  ) : d.label ? (
                    <span className="day-title">{d.label}</span>
                  ) : (
                    <span className="muted">Choose dinner…</span>
                  )}
                </button>
                <div className="chip-row" role="radiogroup" aria-label={`Cook on ${DAYS[d.day]}`}>
                  {[...new Set([...FAMILY_COOKS, ...(d.cook ? [d.cook] : [])])].map((c) => (
                    <button key={c} role="radio" aria-checked={d.cook === c} className={`toggle small${d.cook === c ? ' on' : ''}`}
                      onClick={() => setDay(d.day, { cook: d.cook === c ? null : c })}>
                      👩‍🍳 {c}
                    </button>
                  ))}
                  <button className="toggle small" onClick={() => setDays((ds) => ds.filter((x) => x.day !== d.day))} aria-label={`Remove ${DAYS[d.day]}`}>
                    Remove
                  </button>
                </div>
                <textarea
                  className="day-notes"
                  rows={Math.max(1, d.notes.length)}
                  value={d.notes.join('\n')}
                  onChange={(e) => setDay(d.day, { notes: e.target.value.split('\n') })}
                  placeholder="Note (optional): a swap, a kid boost…"
                  aria-label={`Notes for ${DAYS[d.day]}`}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {missing.length > 0 && (
        <div className="chip-row">
          {missing.map((i) => (
            <button key={i} className="toggle small" onClick={() => setDays((ds) => [...ds, { day: i, recipePath: null, label: '', cook: null, notes: [] }])}>
              + {DAYS[i]}
            </button>
          ))}
        </div>
      )}

      <Section title="Check before saving">
        <div className="chip-row">
          {PROTEINS.filter((p) => v.proteins[p]).map((p) => <Chip key={p}>{PROTEIN_LABEL[p]} × {v.proteins[p]}</Chip>)}
          <Chip>🗓 Sunday prep ~{preview.prepMinutes} min</Chip>
          <Chip>🛒 {preview.shopping} items</Chip>
        </div>
        {flags.length ? (
          <ul className="bullets warn-list">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
        ) : (
          <p className="muted">No repeated key ingredients, dish styles, or recent repeats.</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" onClick={onSave} disabled={saving || !filled.length}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save plan'}
        </button>
        <p className="muted small">
          Saving writes the week's plan with its Sunday Prep checklist and shopping list. Items already checked stay checked.
        </p>
      </Section>

      {picking !== null && (
        <RecipePicker
          monday={monday}
          day={picking}
          current={days.find((d) => d.day === picking)!}
          onPick={(patch) => {
            setDay(picking, patch);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </article>
  );
}

function RecipePicker({ monday, day, current, onPick, onClose }: {
  monday: string;
  day: number;
  current: DraftDay;
  onPick: (patch: Partial<DraftDay>) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [other, setOther] = useState(current.recipePath ? '' : current.label);
  const search = useRef<HTMLInputElement>(null);
  const today = todayIso();
  useEffect(() => {
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // keep the page behind the sheet still
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const recent = addDays(monday, -28);
  const terms = searchTerms(query);
  const rows = searchRecipes([...repo.recipes.values()], query)
    .map(({ recipe: r, matched }) => {
      const dates = (history.get(r.path) ?? []).filter((d) => d < monday);
      return { r, matched, last: dates.at(-1) ?? null, isRecent: (dates.at(-1) ?? '') >= recent };
    })
    .sort((a, b) =>
      (terms.length > 1 ? b.matched.length - a.matched.length : 0) ||
      Number(a.isRecent) - Number(b.isRecent) ||
      (a.last ?? '').localeCompare(b.last ?? '') ||
      a.r.title.localeCompare(b.r.title));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Choose ${DAYS[day]}'s dinner`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{DAYS[day]}, {shortDate(addDays(monday, day)).slice(4)}</h2>
          <button className="button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <input ref={search} type="search" placeholder="Search, or list what you have: salmon, lemon" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="pick-list">
          {rows.map(({ r, matched, last, isRecent }) => (
            <li key={r.path}>
              <button className={`pick${current.recipePath === r.path ? ' selected' : ''}`} onClick={() => onPick({ recipePath: r.path, label: '' })}>
                <span className="day-title">{r.title}</span>
                <span className="card-meta">
                  {r.protein && <span>{PROTEIN_LABEL[r.protein]}</span>}
                  <span>⏱ {r.weeknightMinutes} min</span>
                  {currentRating(r) ? <Stars n={currentRating(r)!.stars} /> : null}
                  {isRecent ? (
                    <Chip tone="warn">On the menu {shortDate(last!)}</Chip>
                  ) : (
                    <span className="muted">{last ? `Last ${ago(last, today)}` : 'Never planned'}</span>
                  )}
                </span>
                {terms.length > 1 && <span className="card-sub">Uses {matched.join(', ')}</span>}
              </button>
            </li>
          ))}
          {!rows.length && <li className="muted">No recipes match.</li>}
        </ul>
        <form
          className="other"
          onSubmit={(e) => {
            e.preventDefault();
            if (other.trim()) onPick({ recipePath: null, label: other.trim() });
          }}
        >
          <label className="field">
            Or something else (leftovers, pizza night, eating out)
            <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Pizza night" />
          </label>
          <button className="button" type="submit" disabled={!other.trim()}>Use this</button>
        </form>
      </div>
    </div>
  );
}

