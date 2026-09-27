// Queues edits to repo files and commits them, surviving concurrent edits by other people and agents.
//
// Every edit is a re-applicable transform ("check 'Lemon (2)'", "rewrite the plan from this draft"), not a finished
// file. Edits apply to the local copy immediately so the UI updates at once; a flush commits each file's pending
// edits in one commit. If the file changed on the server since we last read it, the commit is rejected; we re-read
// the file, apply the same edits to the new version, and try again. Nobody's changes are overwritten.

export interface RemoteFile {
  text: string;
  sha: string;
}

export interface Remote {
  get(path: string): Promise<RemoteFile | null>;
  put(path: string, text: string, sha: string | null, message: string): Promise<RemoteFile>;
}

export interface Edit {
  apply: (text: string | null) => string;
  /** Short description for the commit message, e.g. "check Lemon (2)". */
  describe: string;
}

/** An error from the remote with an HTTP status, e.g. 409 when the file changed underneath us. */
export interface StatusError extends Error {
  status?: number;
}

const CONFLICT = new Set([409, 422]);
const MAX_ATTEMPTS = 4;

export class WriteQueue {
  /** Last known server version of each file (null = doesn't exist yet). */
  readonly base = new Map<string, RemoteFile | null>();
  readonly pending = new Map<string, Edit[]>();
  private readonly remote: Remote;
  private readonly author: () => string;
  private readonly check: (path: string, text: string) => string | null;
  private flushing: Promise<string[]> | null = null;

  constructor(remote: Remote, author: () => string, check: (path: string, text: string) => string | null = () => null) {
    this.remote = remote;
    this.author = author;
    this.check = check;
  }

  /** Replace the known server state (after a full refresh). */
  setBase(files: Map<string, RemoteFile>): void {
    for (const [path, file] of files) this.base.set(path, file);
  }

  /** The file as the user should see it: server version plus edits not yet committed. */
  local(path: string, serverText: string | null = this.base.get(path)?.text ?? null): string | null {
    const edits = this.pending.get(path);
    if (!edits?.length) return serverText;
    return edits.reduce<string | null>((text, e) => e.apply(text), serverText);
  }

  add(path: string, edit: Edit): void {
    this.pending.set(path, [...(this.pending.get(path) ?? []), edit]);
  }

  get size(): number {
    let n = 0;
    for (const edits of this.pending.values()) n += edits.length;
    return n;
  }

  /** Commit all pending edits. Resolves with the paths committed; rejects if any file couldn't be saved. */
  flush(): Promise<string[]> {
    if (!this.flushing) {
      this.flushing = this.flushAll().finally(() => {
        this.flushing = null;
      });
    }
    return this.flushing;
  }

  private async flushAll(): Promise<string[]> {
    const committed: string[] = [];
    const errors: string[] = [];
    for (const path of [...this.pending.keys()]) {
      try {
        if (await this.flushPath(path)) committed.push(path);
      } catch (e) {
        errors.push(`${path}: ${(e as Error).message}`);
      }
    }
    if (errors.length) throw new Error(errors.join('; '));
    return committed;
  }

  private async flushPath(path: string): Promise<boolean> {
    for (let attempt = 1; ; attempt++) {
      const edits = [...(this.pending.get(path) ?? [])];
      if (!edits.length) return false;
      const base = this.base.has(path) ? this.base.get(path)! : await this.remote.get(path);
      this.base.set(path, base);
      const text = edits.reduce<string | null>((t, e) => e.apply(t), base?.text ?? null)!;
      const problem = this.check(path, text);
      if (problem) {
        this.drop(path, edits.length);
        throw new Error(`not saved: ${problem}`);
      }
      if (text === (base?.text ?? null)) {
        this.drop(path, edits.length);
        return false;
      }
      try {
        const saved = await this.remote.put(path, text, base?.sha ?? null, this.message(edits));
        this.base.set(path, saved);
        this.drop(path, edits.length);
        return true;
      } catch (e) {
        const status = (e as StatusError).status;
        if (!status || !CONFLICT.has(status) || attempt >= MAX_ATTEMPTS) throw e;
        // Someone else changed the file: re-read it and re-apply our edits on top.
        this.base.set(path, await this.remote.get(path));
      }
    }
  }

  /** Remove the first `n` edits (the ones just committed); edits added during the commit stay pending. */
  private drop(path: string, n: number): void {
    const rest = (this.pending.get(path) ?? []).slice(n);
    if (rest.length) this.pending.set(path, rest);
    else this.pending.delete(path);
  }

  private message(edits: Edit[]): string {
    const unique = [...new Set(edits.map((e) => e.describe))];
    const summary = unique.length > 3 ? `${unique.slice(0, 3).join('; ')}; and ${unique.length - 3} more` : unique.join('; ');
    const first = summary.charAt(0).toUpperCase() + summary.slice(1);
    return `${first} (by ${this.author()}, via app)`;
  }
}
