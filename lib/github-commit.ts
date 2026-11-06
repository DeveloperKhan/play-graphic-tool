/**
 * Add files to a GitHub repository in one commit, with the Git Data API (no checkout needed).
 * Server-side only: used to drop shared recognizer corrections into the private data repo.
 */

const API_BASE = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export interface CommitTarget {
  /** "owner/name" */
  repo: string;
  branch: string;
  token: string;
}

async function github<T>(
  target: CommitTarget,
  method: string,
  path: string,
  body: unknown,
  fetchImpl: typeof fetch
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(`${API_BASE}/repos/${target.repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${target.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new GitHubError("Could not reach GitHub", 502);
  }
  if (response.status === 401) throw new GitHubError("GitHub rejected the corrections token", 502);
  if (response.status === 403 || response.status === 404) {
    throw new GitHubError(`The corrections token can't write to ${target.repo} (${response.status})`, 502);
  }
  if (!response.ok) {
    const error = new GitHubError(`GitHub API returned ${response.status}`, response.status === 422 ? 409 : 502);
    throw error;
  }
  return (await response.json()) as T;
}

/**
 * Commit `files` (path -> bytes) on top of the branch. If someone else moves the branch in the
 * meantime the ref update is rejected, so the tree and commit are rebuilt on the new head.
 */
export async function commitFiles(
  target: CommitTarget,
  files: Array<{ path: string; content: Uint8Array }>,
  message: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ commit: string }> {
  const blobs = await Promise.all(
    files.map(async (file) => {
      const blob = await github<{ sha: string }>(
        target,
        "POST",
        "/git/blobs",
        { content: Buffer.from(file.content).toString("base64"), encoding: "base64" },
        fetchImpl
      );
      return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
    })
  );

  for (let attempt = 0; ; attempt++) {
    const ref = await github<{ object: { sha: string } }>(
      target,
      "GET",
      `/git/ref/heads/${encodeURIComponent(target.branch)}`,
      null,
      fetchImpl
    );
    const head = ref.object.sha;
    const parent = await github<{ tree: { sha: string } }>(target, "GET", `/git/commits/${head}`, null, fetchImpl);
    const tree = await github<{ sha: string }>(
      target,
      "POST",
      "/git/trees",
      { base_tree: parent.tree.sha, tree: blobs },
      fetchImpl
    );
    const commit = await github<{ sha: string }>(
      target,
      "POST",
      "/git/commits",
      { message, tree: tree.sha, parents: [head] },
      fetchImpl
    );
    try {
      await github(
        target,
        "PATCH",
        `/git/refs/heads/${encodeURIComponent(target.branch)}`,
        { sha: commit.sha, force: false },
        fetchImpl
      );
      return { commit: commit.sha };
    } catch (error) {
      // 422: the branch moved since we read it
      if (error instanceof GitHubError && error.status === 409 && attempt < 3) continue;
      throw error;
    }
  }
}
