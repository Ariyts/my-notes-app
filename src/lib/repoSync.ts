/**
 * Repository Sync Module
 * Handles pushing data files to GitHub (rebuild triggers automatically on push)
 */

export interface SyncResult {
  success: boolean;
  error?: string;
  commitSha?: string;
  commitUrl?: string;
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
 * Main sync function - push all data files
 * GitHub Actions will automatically trigger rebuild on push to master
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

    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check if all files were committed successfully
  const failedFiles = results.filter((r) => !r.success);
  if (failedFiles.length > 0) {
    return {
      success: false,
      error: `Failed to upload: ${failedFiles.map((f) => `${f.file} (${f.error})`).join(', ')}`,
    };
  }

  // Build commit URL
  const commitUrl = lastCommitSha
    ? `https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/commit/${lastCommitSha}`
    : undefined;

  return {
    success: true,
    commitSha: lastCommitSha,
    commitUrl,
  };
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
 * Get repository info
 */
export function getRepoInfo() {
  return {
    owner: REPO_CONFIG.owner,
    repo: REPO_CONFIG.repo,
    branch: REPO_CONFIG.branch,
    url: `https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}`,
    actionsUrl: `https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/actions`,
  };
}
