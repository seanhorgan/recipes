import { useEffect, useState } from 'react';
import { repo, todayIso } from '../data.ts';
import { edit, useSync } from '../sync.ts';
import { DAYS, mondayOf, weekdayIndex } from '../lib/dates.ts';
import { addDayNote, updateChecklistItem, type ChecklistItem, type Plan } from '../lib/plan.ts';
import type { Recipe } from '../lib/recipe.ts';
import { Chip, Inline, PROTEIN_LABEL, Section, routeFor, shortDate } from '../ui.tsx';
import { Bullets, IngredientList } from './RecipeDetail.tsx';
import { RateRecipe } from '../rate.tsx';
import { href } from '../router.ts';

/** Sunday Prep items for this recipe: their "(Recipe, Other recipe)" or "(for Recipe)" label names it. */
function prepItemsFor(plan: Plan, recipe: Recipe): ChecklistItem[] {
  return plan.sundayPrep.filter((i) => {
    const label = /\(([^()]*)\)\s*$/.exec(i.text)?.[1] ?? '';
    return label.includes(recipe.title);
  });
}

export function Tonight() {
  const today = todayIso();
  const plan = repo.plans.find((p) => p.monday === mondayOf(today));
  const night = plan?.days.find((d) => d.date === today);
  const recipe = night?.recipePath ? repo.recipes.get(night.recipePath) : undefined;
  const upcoming = repo.plans.flatMap((p) => p.days).find((d) => d.date > today && (d.recipePath || d.label));

  if (!plan || !night) {
    return (
      <>
        <h1>Tonight</h1>
        <div className="callout">
          <p><strong>Nothing planned for tonight ({DAYS[weekdayIndex(today)]}).</strong></p>
          {upcoming && <p>Next up: {shortDate(upcoming.date)}, {upcoming.label}.</p>}
          <p>
            <a href={href('recipes')}>Find something to make</a> — search by what you have, like "salmon, lemon".
          </p>
        </div>
      </>
    );
  }

  return (
    <article className="tonight">
      <p className="lede">Tonight · {shortDate(today)}</p>
      <h1>{recipe ? recipe.title : night.label}</h1>
      <div className="chip-row">
        {night.cook && <Chip tone="accent">👩‍🍳 {night.cook} is cooking</Chip>}
        {recipe?.protein && <Chip>{PROTEIN_LABEL[recipe.protein]}</Chip>}
        {recipe && <Chip>⏱ {recipe.weeknightMinutes} min</Chip>}
      </div>
      {night.notes.length > 0 && (
        <div className="callout accent">
          {night.notes.map((n) => <p key={n}><Inline text={n} from={plan.path} /></p>)}
        </div>
      )}
      {recipe && <CookRecipe plan={plan} recipe={recipe} />}
      <ChangeOfPlans plan={plan} day={night.day} />
      {recipe && (
        <Section title="How was it?">
          <RateRecipe recipe={recipe} night={today} />
        </Section>
      )}
    </article>
  );
}

function CookRecipe({ plan, recipe }: { plan: Plan; recipe: Recipe }) {
  const sync = useSync();
  const prep = prepItemsFor(plan, recipe);
  // Decided once per visit, so the list doesn't vanish as items get checked off.
  const [showPrep] = useState(() => prep.some((i) => !i.done));
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const toggleStep = (line: number) =>
    setDoneSteps((s) => {
      const next = new Set(s);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });

  return (
    <>
      <KeepAwake />
      {showPrep ? (
        <Section title="Not prepped on Sunday — do these first">
          <ul className="checklist">
            {prep.map((i) => (
              <li key={i.text} className={i.done ? 'done' : ''}>
                <label>
                  <input type="checkbox" checked={i.done} disabled={!sync.connected}
                    onChange={(e) => edit(plan.path, {
                      apply: (t) => updateChecklistItem(t ?? '', 'Sunday Prep', i.text, { done: e.target.checked }),
                      describe: `check ${i.text.replace(/\s*\([^()]*\)\s*$/, '')}`,
                    })} />
                  <span>{i.text.replace(/\s*\([^()]*\)\s*$/, '')}</span>
                </label>
              </li>
            ))}
          </ul>
        </Section>
      ) : prep.length > 0 ? (
        <p className="muted">✓ Sunday prep done.</p>
      ) : recipe.sundayPrep.length > 0 ? (
        <Section title="Prep (if not done on Sunday)">
          <ol className="steps">{recipe.sundayPrep.map((s) => <li key={s.line}><Inline text={s.text} from={recipe.path} /></li>)}</ol>
        </Section>
      ) : null}

      <Section title="Ingredients"><IngredientList recipe={recipe} /></Section>
      <Section title="Steps">
        <ol className="steps big">
          {recipe.weeknight.map((s) => (
            <li key={s.line} className={doneSteps.has(s.line) ? 'done' : ''} onClick={() => toggleStep(s.line)}>
              <Inline text={s.text} from={recipe.path} />
            </li>
          ))}
        </ol>
        <p className="muted small">Tap a step to cross it off.</p>
      </Section>
      {recipe.kidBoost.length > 0 && (
        <Section title="Kid Boost"><div className="callout accent"><Bullets recipe={recipe} items={recipe.kidBoost} /></div></Section>
      )}
      {recipe.notes.length > 0 && <Section title="Notes"><Bullets recipe={recipe} items={recipe.notes} /></Section>}
      <p><a href={routeFor(recipe.path)!}>Full recipe →</a></p>
    </>
  );
}

/** Record a swap or substitution on tonight's plan, or open the planner to change dinners. */
function ChangeOfPlans({ plan, day }: { plan: Plan; day: (typeof DAYS)[number] }) {
  const sync = useSync();
  const [note, setNote] = useState('');
  if (!sync.connected) return null;
  return (
    <Section title="Change of plans?">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          edit(plan.path, { apply: (t) => addDayNote(t ?? '', day, note), describe: `note for ${day}: ${note.trim()}` });
          setNote('');
        }}
      >
        <label className="field">
          Add a note for tonight (a swap, a substitution, what you had instead)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Swap: chicken thighs instead of cod" />
        </label>
        <div className="row">
          <button className="button" type="submit" disabled={!note.trim()}>Add note</button>
          <a className="button" href={href('plan', plan.monday)}>Change or swap dinners</a>
        </div>
      </form>
      <p className="muted small">For bigger changes to the recipe itself, ask an agent (it follows the cook-tonight skill).</p>
    </Section>
  );
}

/** Keeps the phone screen on while cooking, where the browser supports it. */
function KeepAwake() {
  const [on, setOn] = useState(false);
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  useEffect(() => {
    if (!on || !supported) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock.request('screen').then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      }).catch(() => setOn(false));
    void acquire();
    const again = () => document.visibilityState === 'visible' && void acquire();
    document.addEventListener('visibilitychange', again);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', again);
      void lock?.release();
    };
  }, [on, supported]);
  if (!supported) return null;
  return (
    <p className="row">
      <button className={`toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setOn(!on)}>
        {on ? '☀ Screen stays on' : 'Keep screen on while cooking'}
      </button>
    </p>
  );
}
