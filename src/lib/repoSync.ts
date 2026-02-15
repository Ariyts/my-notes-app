/**
 * Repository Sync Module
 * Handles pushing data files to GitHub and triggering rebuild
 */

export interface RepoSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  commitSha?: string;
  workflowTriggered?: boolean;
}

export interface FileCommitResult {
  success: boolean;
  sha?: string;
  error?: string;
}

const REPO_CONFIG = {
  owner: 'Ariyts',
  repo: 'my-notes-app',
  branch: 'master',
  dataPath: 'src/data',
};

const FILES_TO_SYNC = [
  { name: 'prompts.json', type: 'prompts' },
  { name: 'notes.json', type: 'notes' },
  { name: 'snippets.json', type: 'snippets' },
  { name: 'resources.json', type: 'resources' },
] as const;

/**
 * Get the SHA of an existing file (needed for update)
 */
async function getFileSha(
  token: string,
  path: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}?ref=${REPO_CONFIG.branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Commit a single file to the repository
 */
async function commitFile(
  token: string,
  path: string,
  content: string,
  message: string
): Promise<FileCommitResult> {
  const sha = await getFileSha(token, path);

  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: REPO_CONFIG.branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      sha: data.commit.sha,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Trigger GitHub Actions workflow to rebuild the site
 */
async function triggerWorkflow(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/actions/workflows/deploy.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: REPO_CONFIG.branch,
        }),
      }
    );

    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}

/**
 * Main sync function - push all data files and trigger rebuild
 */
export async function syncToRepository(
  data: {
    prompts: unknown[];
    notes: unknown[];
    snippets: unknown[];
    resources: unknown[];
  },
  token: string,
  onProgress?: (status: string) => void
): Promise<SyncResult> {
  const timestamp = new Date().toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const commitMessage = `Update data - ${timestamp}`;

  const results: { file: string; success: boolean; error?: string }[] = [];
  let lastCommitSha: string | undefined;

  // Commit each file
  for (const file of FILES_TO_SYNC) {
    onProgress?.(`Uploading ${file.name}...`);

    const content = JSON.stringify(data[file.type], null, 2);
    const result = await commitFile(
      token,
      `${REPO_CONFIG.dataPath}/${file.name}`,
      content,
      commitMessage
    );

    results.push({
      file: file.name,
      success: result.success,
      error: result.error,
    });

    if (result.success && result.sha) {
      lastCommitSha = result.sha;
    }
  }

  // Check if all files were committed successfully
  const failedFiles = results.filter((r) => !r.success);
  if (failedFiles.length > 0) {
    return {
      success: false,
      error: `Failed to upload: ${failedFiles.map((f) => `${f.file} (${f.error})`).join(', ')}`,
    };
  }

  // Trigger workflow
  onProgress?.('Triggering site rebuild...');
  const workflowTriggered = await triggerWorkflow(token);

  if (!workflowTriggered) {
    return {
      success: true,
      commitSha: lastCommitSha,
      workflowTriggered: false,
      error: 'Files uploaded but failed to trigger rebuild. Manual rebuild may be needed.',
    };
  }

  return {
    success: true,
    commitSha: lastCommitSha,
    workflowTriggered: true,
  };
}

/**
 * Get repository sync status (last commit info)
 */
export async function getLastCommitInfo(token: string): Promise<{
  success: boolean;
  data?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/commits?path=src/data&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch commit info' };
    }

    const commits = await response.json();
    if (commits.length === 0) {
      return { success: true, data: undefined };
    }

    const latest = commits[0];
    return {
      success: true,
      data: {
        sha: latest.sha.substring(0, 7),
        message: latest.commit.message,
        date: latest.commit.committer.date,
        author: latest.commit.author?.login || latest.commit.committer.name,
      },
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Validate GitHub token has required permissions
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  user?: string;
}> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const user = await response.json();

    // Check if user has write access to the repo
    const repoResponse = await fetch(
      `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (repoResponse.ok) {
      const repoData = await repoResponse.json();
      if (!repoData.permissions?.push) {
        return { valid: false, error: 'No write access to repository' };
      }
    }

    return { valid: true, user: user.login };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { valid: false, error: errorMessage };
  }
}

/**
 * Get stored last sync info from localStorage
 */
export function getLastSyncInfo(): {
  timestamp: string | null;
  commitSha: string | null;
} {
  try {
    const data = localStorage.getItem('repo_sync_info');
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return { timestamp: null, commitSha: null };
}

/**
 * Save last sync info to localStorage
 */
export function saveLastSyncInfo(commitSha: string): void {
  localStorage.setItem(
    'repo_sync_info',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      commitSha,
    })
  );
}
