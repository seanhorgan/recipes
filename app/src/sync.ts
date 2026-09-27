// Connects this device to GitHub: loads live data, polls for the other adult's changes, and saves edits.
import { useSyncExternalStore } from 'react';
import { currentFiles, setFiles } from './data.ts';
import { fetchRepoFiles, getFile, putFile, verifyToken } from './github.ts';
import { clearSettings, loadSettings, saveSettings, type DeviceSettings } from './settings.ts';
import { WriteQueue, type Edit } from './lib/writeQueue.ts';
import { isPlanPath, parsePlan } from './lib/plan.ts';
import { parseRecipe } from './lib/recipe.ts';
import { isRecipePath, isSaucePath } from './lib/repo.ts';

export type SyncState = 'offline' | 'loading' | 'live' | 'saving' | 'error';

export interface SyncStatus {
  connected: boolean;
  name: string | null;
  login: string | null;
  state: SyncState;
  message: string | null;
  lastSynced: Date | null;
  unsaved: number;
}

const POLL_MS = 45_000;
const SAVE_DELAY_MS = 1_500;

let settings: DeviceSettings | null = loadSettings();
let queue: WriteQueue | null = null;
let status: SyncStatus = {
  connected: false,
  name: null,
  login: null,
  state: 'offline',
  message: null,
  lastSynced: null,
  unsaved: 0,
};
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let refreshing = false;

function update(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch, unsaved: queue?.size ?? 0 };
  for (const l of listeners) l();
}

export function useSync(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
  );
}

/** Refuse to save a plan or recipe the app itself can't read back. */
function checkFile(path: string, text: string): string | null {
  const issues = isPlanPath(path)
    ? parsePlan(path, text).issues.items
    : isRecipePath(path) || isSaucePath(path)
      ? parseRecipe(path, text).issues.items
      : [];
  const errors = issues.filter((i) => i.level === 'error');
  return errors.length ? errors.map((e) => e.message).join('; ') : null;
}

function start(s: DeviceSettings): void {
  settings = s;
  queue = new WriteQueue(
    { get: (path) => getFile(s.token, path), put: (path, text, sha, message) => putFile(s.token, path, text, sha, message) },
    () => settings?.name ?? 'app',
    checkFile,
  );
  update({ connected: true, name: s.name, login: s.login, state: 'loading', message: null });
  void refresh();
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void refresh();
  }, POLL_MS);
}

/** Load the latest files from GitHub, keeping any edits that haven't been saved yet. */
export async function refresh(): Promise<void> {
  if (!settings || !queue || refreshing) return;
  refreshing = true;
  try {
    const { files } = await fetchRepoFiles(settings.token);
    queue.setBase(files);
    const next = new Map<string, string>();
    for (const [path, file] of files) next.set(path, queue.local(path, file.text) ?? file.text);
    for (const path of queue.pending.keys()) if (!next.has(path)) next.set(path, queue.local(path) ?? '');
    setFiles(next);
    update({ state: queue.size ? status.state : 'live', message: queue.size ? status.message : null, lastSynced: new Date() });
  } catch (e) {
    update({ state: 'error', message: (e as Error).message });
  } finally {
    refreshing = false;
  }
}

/** Apply an edit now and save it to GitHub shortly (edits made close together share one commit). */
export function edit(path: string, e: Edit): void {
  if (!queue) throw new Error('This device is not connected. Connect it in Settings to save changes.');
  queue.add(path, e);
  // Edits are idempotent, so re-applying them over the on-screen copy (if the server copy isn't loaded yet) is safe.
  const shown = queue.base.has(path) ? queue.local(path) : queue.local(path, currentFiles().get(path) ?? null);
  setFiles(new Map([[path, shown ?? '']]), false);
  update({});
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), SAVE_DELAY_MS);
}

/** Save pending edits now. Resolves once they're committed (or rejects with the reason they weren't). */
export async function save(): Promise<void> {
  if (!queue || !queue.size) return;
  clearTimeout(saveTimer);
  update({ state: 'saving', message: null });
  try {
    await queue.flush();
    // Show exactly what's on the server now (plus anything edited during the save).
    const next = new Map<string, string>();
    for (const [path, file] of queue.base) if (file) next.set(path, queue.local(path, file.text) ?? file.text);
    setFiles(next, false);
    update({ state: 'live', lastSynced: new Date() });
    if (queue.size) saveTimer = setTimeout(() => void save(), SAVE_DELAY_MS);
  } catch (e) {
    // Put the screen back in line with what's actually saved plus what's still pending.
    const next = new Map<string, string>();
    for (const [path, file] of queue.base) next.set(path, queue.local(path, file?.text ?? null) ?? file?.text ?? '');
    setFiles(next, false);
    update({ state: 'error', message: (e as Error).message });
    throw e;
  }
}

export async function connect(token: string, name: string): Promise<void> {
  const { login, canWrite } = await verifyToken(token.trim());
  const s = { token: token.trim(), name: name.trim(), login };
  saveSettings(s);
  start(s);
  if (!canWrite) {
    update({ message: `Connected as ${login}, but that account may not be able to write to the repo.` });
  }
}

export function disconnect(): void {
  clearSettings();
  clearInterval(pollTimer);
  clearTimeout(saveTimer);
  settings = null;
  queue = null;
  update({ connected: false, name: null, login: null, state: 'offline', message: null, lastSynced: null });
}

export function setName(name: string): void {
  if (!settings) return;
  settings = { ...settings, name: name.trim() };
  saveSettings(settings);
  update({ name: settings.name });
}

// Keep in step with the other device, and don't lose edits when the app is closed.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
    else if (queue?.size) void save().catch(() => {});
  });
  window.addEventListener('beforeunload', (e) => {
    if (queue?.size) e.preventDefault();
  });
  if (settings) start(settings);
}
