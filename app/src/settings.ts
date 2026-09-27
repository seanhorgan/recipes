// Per-device settings: the GitHub token and who is using this phone. Stored only in this browser.

export interface DeviceSettings {
  token: string;
  /** Who is using this device, e.g. "Ali"; shown in commit messages. */
  name: string;
  /** GitHub account the token belongs to. */
  login: string;
}

const KEY = 'family-meals:device';

export function loadSettings(): DeviceSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<DeviceSettings>) : null;
    return s?.token && s.name ? { token: s.token, name: s.name, login: s.login ?? '' } : null;
  } catch {
    return null;
  }
}

export function saveSettings(s: DeviceSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private browsing or storage disabled: the connection lasts until the page is closed.
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
