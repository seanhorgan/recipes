import { useMemo, useState } from 'react';
import { currentFiles, repo } from '../data.ts';
import { edit, save, useSync } from '../sync.ts';
import { keepRatings, prepareRecipe } from '../lib/importRecipe.ts';
import { Chip, PROTEIN_LABEL, Section } from '../ui.tsx';
import { IngredientList, Steps } from './RecipeDetail.tsx';
import { href } from '../router.ts';

/**
 * Paste a recipe written in the repo's format (for example by Claude chat, following chat/claude-project.md),
 * check it, and save it as recipes/<name>.md. Pasting a recipe with an existing title replaces that recipe.
 */
export function AddRecipe() {
  const sync = useSync();
  const [text, setText] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prepared = useMemo(() => prepareRecipe(text, currentFiles()), [text, repo]);

  if (!sync.connected) {
    return (
      <>
        <h1>Add a recipe</h1>
        <p className="callout"><a href={href('settings')}>Connect this device</a> to add recipes.</p>
      </>
    );
  }

  const existing = prepared?.replacing ? repo.recipes.get(prepared.path) : undefined;
  const canSave = !!prepared && !prepared.errors.length && (!prepared.replacing || confirmReplace) && !saving;

  const onSave = async () => {
    if (!prepared) return;
    setSaving(true);
    setError(null);
    const { path, title, text: newText, replacing } = prepared;
    edit(path, {
      apply: (current) => keepRatings(newText, current),
      describe: `${replacing ? 'update' : 'add'} recipe ${title}`,
    });
    try {
      await save();
      window.location.hash = href('recipes', path.replace(/^recipes\/|\.md$/g, ''));
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <article>
      <p className="back"><a href={href('recipes')}>← Recipes</a></p>
      <h1>Add a recipe</h1>
      <p className="muted">
        Paste a recipe written in the recipe-box format, for example one Claude chat wrote for you. The app checks it
        before saving. Pasting a recipe with the same title as an existing one updates that recipe (its ratings are kept).
      </p>
      <label className="field">
        Recipe
        <textarea
          className="paste"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setConfirmReplace(false);
          }}
          placeholder={'---\nprotein: fish\ngluten_free: yes\n…\n---\n# Recipe title\n\n## Ingredients\n…'}
          spellCheck={false}
          rows={10}
        />
      </label>

      {prepared && (
        <>
          <Section title="Check">
            <p>
              {prepared.replacing ? (
                <>Updates <a href={href('recipes', prepared.path.slice(8, -3))}>{existing?.title ?? prepared.title}</a>.</>
              ) : (
                <>New recipe, saved as <code>{prepared.path}</code>.</>
              )}
            </p>
            {prepared.errors.length > 0 ? (
              <>
                <p className="error">Fix these before saving (ask Claude to correct the recipe and paste it again):</p>
                <ul className="bullets">{prepared.errors.map((e) => <li key={e}>{e}</li>)}</ul>
              </>
            ) : (
              <p>✓ The format looks right.</p>
            )}
            {prepared.warnings.length > 0 && (
              <ul className="bullets warn-list">{prepared.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            )}
            {prepared.replacing && !prepared.errors.length && (
              <label className="confirm">
                <input type="checkbox" checked={confirmReplace} onChange={(e) => setConfirmReplace(e.target.checked)} />
                Replace the saved version of this recipe
              </label>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button primary" onClick={onSave} disabled={!canSave}>
              {saving ? 'Saving…' : prepared.replacing ? 'Save changes' : 'Save recipe'}
            </button>
          </Section>

          {!prepared.errors.length && (
            <Section title="Preview">
              <h2>{prepared.recipe.title}</h2>
              <div className="chip-row">
                {prepared.recipe.protein && <Chip>{PROTEIN_LABEL[prepared.recipe.protein]}</Chip>}
                <Chip>⏱ {prepared.recipe.weeknightMinutes} min weeknight</Chip>
                {prepared.recipe.prepMinutes > 0 && <Chip>🗓 {prepared.recipe.prepMinutes} min Sunday prep</Chip>}
              </div>
              <h3>Ingredients</h3>
              <IngredientList recipe={prepared.recipe} />
              {prepared.recipe.sundayPrep.length > 0 && (<><h3>Sunday Prep</h3><Steps recipe={prepared.recipe} steps={prepared.recipe.sundayPrep} /></>)}
              <h3>Weeknight</h3>
              <Steps recipe={prepared.recipe} steps={prepared.recipe.weeknight} />
            </Section>
          )}
        </>
      )}
    </article>
  );
}
