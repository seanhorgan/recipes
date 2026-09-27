import { recipeStats, repo, todayIso, history } from '../data.ts';
import { formatQuantity, type Ingredient } from '../lib/ingredients.ts';
import { resolveLink } from '../lib/markdown.ts';
import type { Recipe } from '../lib/recipe.ts';
import { Chip, GitHubLinks, Inline, PROTEIN_LABEL, RecipeRating, Section, Stars, ago, routeFor, shortDate } from '../ui.tsx';
import { mondayOf } from '../lib/dates.ts';
import { href } from '../router.ts';
import { RateRecipe } from '../rate.tsx';

export function IngredientList({ recipe }: { recipe: Recipe }) {
  const groups: { name: string | null; items: Ingredient[] }[] = [];
  for (const i of recipe.ingredients) {
    const last = groups.at(-1);
    if (last && last.name === i.group) last.items.push(i);
    else groups.push({ name: i.group, items: [i] });
  }
  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.name && <h3>{g.name}</h3>}
          <ul className="ingredients">
            {g.items.map((i) => {
              const sauce = i.link ? routeFor(resolveLink(recipe.path, i.link)) : null;
              const qty = i.quantity ? formatQuantity(i.quantity, i.unit, i.size) : '';
              return (
                <li key={i.line}>
                  {i.optional && <span className="muted">Optional: </span>}
                  {qty && <span className="qty">{qty} </span>}
                  {sauce ? <a href={sauce}>{i.name}</a> : <Inline text={i.name} from={recipe.path} />}
                  {i.note && <span className="muted">, <Inline text={i.note} from={recipe.path} /></span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

export function Steps({ recipe, steps }: { recipe: Recipe; steps: Recipe['weeknight'] }) {
  return (
    <ol className="steps">
      {steps.map((s) => <li key={s.line}><Inline text={s.text} from={recipe.path} /></li>)}
    </ol>
  );
}

export function Bullets({ recipe, items }: { recipe: Recipe; items: Recipe['notes'] }) {
  return (
    <ul className="bullets">
      {items.map((s) => <li key={s.line}><Inline text={s.text} from={recipe.path} /></li>)}
    </ul>
  );
}

/** Sauces linked from this recipe's ingredients. */
function linkedSauces(recipe: Recipe): Recipe[] {
  return recipe.ingredients
    .filter((i) => i.link)
    .map((i) => repo.sauces.get(resolveLink(recipe.path, i.link!)))
    .filter((s): s is Recipe => !!s);
}

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const today = todayIso();
  const stats = recipeStats(recipe, today);
  const cooked = history.get(recipe.path) ?? [];
  const sauces = linkedSauces(recipe);
  const ratings = [...recipe.ratings].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article>
      <p className="back"><a href={href('recipes')}>← Recipes</a></p>
      <h1>{recipe.title}</h1>
      {recipe.description && <p className="lede">{recipe.description}</p>}
      <div className="chip-row">
        {recipe.protein && <Chip>{PROTEIN_LABEL[recipe.protein]}</Chip>}
        <Chip>⏱ {recipe.weeknightMinutes} min weeknight</Chip>
        {recipe.prepMinutes > 0 && <Chip>🗓 {recipe.prepMinutes} min Sunday prep</Chip>}
        <Chip>{recipe.glutenFree === 'yes' ? '✓ Gluten-free' : 'GF with a swap'}</Chip>
        {recipe.tags.map((t) => <Chip key={t}>{t}</Chip>)}
      </div>
      <p className="muted">
        <RecipeRating recipe={recipe} />
        {' · '}
        {stats.last ? `Last cooked ${ago(stats.last, today)}` : 'Not cooked yet'}
        {stats.count > 1 ? ` · cooked ${stats.count}×` : ''}
        {stats.next ? ` · planned for ${shortDate(stats.next)}` : ''}
      </p>

      <Section title="Ingredients"><IngredientList recipe={recipe} /></Section>

      {(recipe.sundayPrep.length > 0 || sauces.length > 0) && (
        <Section title="Sunday Prep" id="prep">
          {recipe.sundayPrep.length > 0 && <Steps recipe={recipe} steps={recipe.sundayPrep} />}
          {sauces.map((s) => (
            <p key={s.path} className="callout">
              Make the <a href={routeFor(s.path)!}>{s.title}</a> ahead too.
            </p>
          ))}
        </Section>
      )}

      <Section title="Weeknight" id="weeknight"><Steps recipe={recipe} steps={recipe.weeknight} /></Section>

      {recipe.kidBoost.length > 0 && (
        <Section title="Kid Boost"><div className="callout accent"><Bullets recipe={recipe} items={recipe.kidBoost} /></div></Section>
      )}
      {recipe.notes.length > 0 && <Section title="Notes"><Bullets recipe={recipe} items={recipe.notes} /></Section>}

      <Section title="Ratings">
        {ratings.length ? (
          <ul className="ratings">
            {ratings.map((r) => (
              <li key={r.line}><Stars n={r.stars} /> <span className="muted">{shortDate(r.date)}</span>{r.note && ` — ${r.note}`}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No ratings yet.</p>
        )}
        <RateRecipe recipe={recipe} />
      </Section>

      {cooked.length > 0 && (
        <Section title="On the menu">
          <ul className="bullets">
            {[...cooked].reverse().map((d) => (
              <li key={d}><a href={href('plans', mondayOf(d))}>{shortDate(d)}, {d.slice(0, 4)}</a></li>
            ))}
          </ul>
        </Section>
      )}

      <GitHubLinks path={recipe.path} />
    </article>
  );
}

export function SauceDetail({ sauce }: { sauce: Recipe }) {
  const usedBy = [...repo.recipes.values()].filter((r) => linkedSauces(r).includes(sauce));
  return (
    <article>
      <p className="back"><a href={href('recipes')}>← Recipes</a></p>
      <h1>{sauce.title}</h1>
      {sauce.description && <p className="lede">{sauce.description}</p>}
      <div className="chip-row"><Chip>Sauce</Chip>{sauce.prepMinutes > 0 && <Chip>🗓 {sauce.prepMinutes} min</Chip>}</div>
      <Section title="Ingredients"><IngredientList recipe={sauce} /></Section>
      <Section title="Directions"><Steps recipe={sauce} steps={sauce.directions} /></Section>
      {sauce.notes.length > 0 && <Section title="Notes"><Bullets recipe={sauce} items={sauce.notes} /></Section>}
      {usedBy.length > 0 && (
        <Section title="Used in">
          <ul className="bullets">
            {usedBy.map((r) => <li key={r.path}><a href={routeFor(r.path)!}>{r.title}</a></li>)}
          </ul>
        </Section>
      )}
      <GitHubLinks path={sauce.path} />
    </article>
  );
}

