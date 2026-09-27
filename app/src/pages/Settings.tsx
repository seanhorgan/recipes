import { useState } from 'react';
import { connect, disconnect, refresh, save, setName, useSync } from '../sync.ts';
import { OWNER, REPO } from '../github.ts';
import { Section } from '../ui.tsx';
import { FAMILY_COOKS } from '../family.ts';

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

export function Settings() {
  const sync = useSync();
  const [token, setToken] = useState('');
  const [name, setNameInput] = useState(sync.name ?? FAMILY_COOKS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await connect(token, name);
      setToken('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Settings</h1>
      {sync.connected ? (
        <>
          <Section title="This device">
            <p>
              Connected as <strong>{sync.login}</strong>. Changes are saved to{' '}
              <code>{OWNER}/{REPO}</code> as commits "by {sync.name}".
            </p>
            <p className="muted">
              {sync.state === 'error' && sync.message ? `⚠ ${sync.message}` : sync.lastSynced ? `Last synced ${sync.lastSynced.toLocaleTimeString()}.` : 'Syncing…'}
              {sync.unsaved > 0 && ` ${sync.unsaved} change${sync.unsaved === 1 ? '' : 's'} waiting to save.`}
            </p>
            <div className="row">
              <button className="button" onClick={() => void refresh()}>Sync now</button>
              {sync.unsaved > 0 && <button className="button" onClick={() => void save().catch(() => {})}>Retry saving</button>}
            </div>
          </Section>
          <Section title="Who's using this phone?">
            <NamePicker value={sync.name ?? ''} onChange={setName} />
          </Section>
          <Section title="Disconnect">
            <p className="muted">Removes the token from this device. You can also revoke it on GitHub at any time.</p>
            <button
              className="button danger"
              onClick={() => {
                if (!sync.unsaved || confirm('Some changes haven’t been saved yet. Disconnect anyway?')) disconnect();
              }}
            >
              Disconnect this device
            </button>
          </Section>
        </>
      ) : (
        <form onSubmit={onConnect}>
          <Section title="Connect this device">
            <p>
              Anyone can browse recipes and plans. To plan a week or check things off, connect this device with a
              GitHub token. You only do this once per phone.
            </p>
            <ol className="steps">
              <li>
                Open <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer">GitHub → New fine-grained token</a>.
              </li>
              <li>Repository access: <strong>Only select repositories → {OWNER}/{REPO}</strong>.</li>
              <li>Permissions: <strong>Contents → Read and write</strong>. Nothing else.</li>
              <li>Generate the token and paste it below.</li>
            </ol>
            <label className="field">
              GitHub token
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_…"
                required
              />
            </label>
            <div className="field">
              Who's using this phone?
              <NamePicker value={name} onChange={setNameInput} />
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button primary" type="submit" disabled={busy || !token.trim() || !name.trim()}>
              {busy ? 'Checking…' : 'Connect'}
            </button>
            <p className="muted small">
              The token is stored only in this browser and is sent only to GitHub. It is never saved in the repo.
            </p>
          </Section>
        </form>
      )}
    </>
  );
}

function NamePicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div className="chip-row" role="radiogroup">
      {FAMILY_COOKS.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} className={`toggle${value === n ? ' on' : ''}`} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}
