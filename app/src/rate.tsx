import { useState } from 'react';
import { history, todayIso, daysBetween } from './data.ts';
import { edit, useSync } from './sync.ts';
import { addRating, type Recipe } from './lib/recipe.ts';
import { shortDate } from './ui.tsx';
import { href } from './router.ts';

/** Which night a new rating is for: `night` if given, else the most recent planned night this week, else today. */
function defaultNight(recipe: Recipe, today: string): string {
  const last = (history.get(recipe.path) ?? []).filter((d) => d <= today).at(-1);
  return last && daysBetween(last, today) <= 7 ? last : today;
}

/** One family rating per night, saved to the recipe's `## Ratings`. */
export function RateRecipe({ recipe, night }: { recipe: Recipe; night?: string }) {
  const sync = useSync();
  const today = todayIso();
  const date = night ?? defaultNight(recipe, today);
  const existing = recipe.ratings.find((r) => r.date === date);
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [note, setNote] = useState(existing?.note ?? '');
  const [saved, setSaved] = useState(false);

  if (!sync.connected) {
    return <p className="muted small"><a href={href('settings')}>Connect this device</a> to rate dinners.</p>;
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stars) return;
    edit(recipe.path, {
      apply: (text) => addRating(text ?? '', { date, stars, note }),
      describe: `rate ${recipe.title} ${'★'.repeat(stars)}`,
    });
    setSaved(true);
  };
  return (
    <form className="rate" onSubmit={submit}>
      <div className="row">
        <span className="muted">{date === today ? 'Tonight' : shortDate(date)}:</span>
        <span className="star-input" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n === 1 ? '' : 's'}`}
              className={n <= stars ? 'on' : ''} onClick={() => { setStars(n); setSaved(false); }}>
              ★
            </button>
          ))}
        </span>
      </div>
      <label className="field">
        Note (optional)
        <input value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} placeholder="Kids asked for seconds" />
      </label>
      <div className="row">
        <button className="button primary" type="submit" disabled={!stars}>{existing ? 'Update rating' : 'Save rating'}</button>
        {saved && <span className="muted" role="status">Saved for everyone</span>}
      </div>
    </form>
  );
}
