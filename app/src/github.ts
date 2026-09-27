// Talks to the GitHub API with the token saved on this device. Reads use one GraphQL query per refresh;
// writes use the contents API, which rejects a commit if the file changed since we read it (see lib/writeQueue.ts).
import type { RemoteFile, StatusError } from './lib/writeQueue.ts';

export const OWNER = 'seanhorgan';
export const REPO = 'recipes';
export const BRANCH = 'main';
const API = 'https://api.github.com';

function error(message: string, status?: number): StatusError {
  return Object.assign(new Error(message), { status });
}

async function request(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw error("Couldn't reach GitHub. Check your connection.");
  }
  if (res.ok || res.status === 404) return res;
  let detail = '';
  try {
    detail = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    // no JSON body
  }
  if (res.status === 401) throw error('GitHub rejected the token (it may have expired). Reconnect in Settings.', 401);
  if (res.status === 403) {
    throw error(`GitHub refused (${detail || 'forbidden'}). The token needs "Contents: Read and write" on ${OWNER}/${REPO}.`, 403);
  }
  throw error(detail || `GitHub error ${res.status}`, res.status);
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await request(token, '/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length || !body.data) throw error(body.errors?.[0]?.message ?? 'GitHub GraphQL error');
  return body.data;
}

// UTF-8 safe base64 (recipes use characters like ½, °, and ★).
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** Checks the token works and can see the repo. Returns the GitHub login and whether it looks writable. */
export async function verifyToken(token: string): Promise<{ login: string; canWrite: boolean }> {
  const data = await graphql<{
    viewer: { login: string };
    repository: { viewerPermission: string | null } | null;
  }>(token, `query($o:String!,$n:String!){ viewer { login } repository(owner:$o, name:$n) { viewerPermission } }`, {
    o: OWNER,
    n: REPO,
  });
  if (!data.repository) throw error(`The token can't see ${OWNER}/${REPO}. Give it access to that repository.`);
  return { login: data.viewer.login, canWrite: ['WRITE', 'MAINTAIN', 'ADMIN'].includes(data.repository.viewerPermission ?? '') };
}

interface BlobEntry {
  name: string;
  object: { oid?: string; text?: string | null } | null;
}
interface TreeEntries {
  entries: BlobEntry[];
}
const BLOBS = 'entries { name object { ... on Blob { oid text } } }';

/** Every file the app reads (recipes, sauces, plans, ingredient catalog) at the latest commit on main. */
export async function fetchRepoFiles(token: string): Promise<{ commit: string; files: Map<string, RemoteFile> }> {
  const first = await graphql<{
    repository: {
      ref: { target: { oid: string } } | null;
    };
  }>(token, `query($o:String!,$n:String!){ repository(owner:$o, name:$n) { ref(qualifiedName:"refs/heads/${BRANCH}") { target { oid } } } }`, {
    o: OWNER,
    n: REPO,
  });
  const commit = first.repository.ref?.target.oid;
  if (!commit) throw error(`Branch ${BRANCH} not found`);

  // Pin everything to that commit so the snapshot is consistent.
  const data = await graphql<{
    repository: {
      root: { entries: { name: string; type: string }[] } | null;
      recipes: TreeEntries | null;
      sauces: TreeEntries | null;
      catalog: { oid: string; text: string | null } | null;
    };
  }>(
    token,
    `query($o:String!,$n:String!){ repository(owner:$o, name:$n) {
      root: object(expression:"${commit}:") { ... on Tree { entries { name type } } }
      recipes: object(expression:"${commit}:recipes") { ... on Tree { ${BLOBS} } }
      sauces: object(expression:"${commit}:sauces") { ... on Tree { ${BLOBS} } }
      catalog: object(expression:"${commit}:reference/ingredients.md") { ... on Blob { oid text } }
    } }`,
    { o: OWNER, n: REPO },
  );

  const files = new Map<string, RemoteFile>();
  const addBlobs = (dir: string, tree: TreeEntries | null) => {
    for (const e of tree?.entries ?? []) {
      if (e.name.endsWith('.md') && e.object?.oid && typeof e.object.text === 'string') {
        files.set(`${dir}/${e.name}`, { text: e.object.text, sha: e.object.oid });
      }
    }
  };
  addBlobs('recipes', data.repository.recipes);
  addBlobs('sauces', data.repository.sauces);
  if (data.repository.catalog?.text) {
    files.set('reference/ingredients.md', { text: data.repository.catalog.text, sha: data.repository.catalog.oid });
  }

  // Weekly plans live in YYYY/Month/ folders.
  const years = (data.repository.root?.entries ?? []).filter((e) => e.type === 'tree' && /^\d{4}$/.test(e.name));
  if (years.length) {
    const plans = await graphql<{ repository: Record<string, { entries: { name: string; object: TreeEntries | null }[] } | null> }>(
      token,
      `query($o:String!,$n:String!){ repository(owner:$o, name:$n) {
        ${years.map((y) => `y${y.name}: object(expression:"${commit}:${y.name}") { ... on Tree { entries { name object { ... on Tree { ${BLOBS} } } } } }`).join('\n')}
      } }`,
      { o: OWNER, n: REPO },
    );
    for (const y of years) {
      for (const month of plans.repository[`y${y.name}`]?.entries ?? []) addBlobs(`${y.name}/${month.name}`, month.object);
    }
  }
  return { commit, files };
}

function contentsPath(path: string): string {
  return `/repos/${OWNER}/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function getFile(token: string, path: string): Promise<RemoteFile | null> {
  const res = await request(token, `${contentsPath(path)}?ref=${BRANCH}`);
  if (res.status === 404) return null;
  const body = (await res.json()) as { content: string; sha: string };
  return { text: fromBase64(body.content), sha: body.sha };
}

export async function putFile(token: string, path: string, text: string, sha: string | null, message: string): Promise<RemoteFile> {
  const res = await request(token, contentsPath(path), {
    method: 'PUT',
    body: JSON.stringify({ message, content: toBase64(text), branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (res.status === 404) throw error(`Couldn't save ${path}: the token can't write to ${OWNER}/${REPO}.`, 404);
  const body = (await res.json()) as { content: { sha: string } };
  return { text, sha: body.content.sha };
}
