/**
 * Restore from GitHub
 * 
 * Multi-step wizard for restoring encrypted data from GitHub:
 * 1. Enter GitHub token
 * 2. Detect repository and check for encrypted data
 * 3. Enter master password
 * 4. Decrypt and load data
 */

import { useState } from 'react';
import {
  Github,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  FileText,
  Shield,
} from 'lucide-react';
import {
  decrypt,
  encrypt,
  markEncryptionSetUp,
  savePasswordHash,
  generatePasswordHash,
  saveEncryptedVault,
  setSessionKey,
  deriveKey,
  EncryptedData,
} from '../../lib/crypto';

interface RestoreFromGitHubProps {
  onComplete: () => void;
  onBack: () => void;
}

type RestoreStep = 'token' | 'check' | 'password' | 'restoring' | 'success' | 'error';

interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
  lastModified?: string;
  fileCount: number;
}

// Storage keys
const REPO_SYNC_CONFIG_KEY = 'pentest-hub-repo-sync-config';
const WORKSPACES_KEY = 'pentest-hub-workspaces';
const SECTIONS_KEY = 'pentest-hub-sections';
const SYNC_VERSION_KEY = 'pentest-hub-sync-version';

export function RestoreFromGitHub({ onComplete, onBack }: RestoreFromGitHubProps) {
  const [step, setStep] = useState<RestoreStep>('token');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [restoredStats, setRestoredStats] = useState<{
    workspaces: number;
    sections: number;
    items: number;
  } | null>(null);

  // Detect repository from URL
  const detectRepoFromUrl = (): { owner: string; repo: string } | null => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname.endsWith('.github.io')) {
      const owner = hostname.replace('.github.io', '');
      const pathParts = pathname.split('/').filter(Boolean);
      const repo = pathParts[0] || `${owner}.github.io`;
      return { owner, repo };
    }

    return null;
  };

  // Fetch file from GitHub API
  const fetchGitHubFile = async (
    owner: string,
    repo: string,
    path: string,
    branch: string,
    ghToken: string
  ): Promise<{ content: string; sha: string } | null> => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        return { content, sha: data.sha };
      }
    } catch (err) {
      console.error('Failed to fetch:', path, err);
    }
    return null;
  };

  // Step 1: Connect and check for encrypted data
  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Please enter your GitHub token');
      return;
    }

    setStep('check');
    setError(null);

    try {
      // Validate token
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (userRes.status === 401) {
        setError('Invalid token. Please check and try again.');
        setStep('token');
        return;
      }

      if (!userRes.ok) {
        setError(`GitHub API error: ${userRes.status}`);
        setStep('token');
        return;
      }

      // Detect repository
      const detected = detectRepoFromUrl();
      if (!detected) {
        setError('Could not detect repository. Make sure you are on GitHub Pages.');
        setStep('token');
        return;
      }

      // Get repository info
      const repoRes = await fetch(
        `https://api.github.com/repos/${detected.owner}/${detected.repo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (repoRes.status === 404) {
        setError(`Repository '${detected.owner}/${detected.repo}' not found or no access.`);
        setStep('token');
        return;
      }

      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch;

      // Check for encrypted data
      const metadataFile = await fetchGitHubFile(
        detected.owner,
        detected.repo,
        'data/metadata.json',
        defaultBranch,
        token
      );

      const workspacesFile = await fetchGitHubFile(
        detected.owner,
        detected.repo,
        'data/workspaces.enc.json',
        defaultBranch,
        token
      );

      if (!workspacesFile) {
        setError('No encrypted data found in this repository. Try "New User" instead.');
        setStep('token');
        return;
      }

      // Parse metadata for stats
      let lastModified: string | undefined;
      let fileCount = 1; // workspaces.enc.json

      if (metadataFile) {
        try {
          const metadata = JSON.parse(metadataFile.content);
          lastModified = metadata.lastModified;
        } catch {}
      }

      // Check for sections.enc.json
      const sectionsFile = await fetchGitHubFile(
        detected.owner,
        detected.repo,
        'data/sections.enc.json',
        defaultBranch,
        token
      );
      if (sectionsFile) fileCount++;

      // Count section files
      try {
        const sectionsData = JSON.parse(sectionsFile?.content || '{}');
        if (sectionsData.algorithm === 'AES-256-GCM') {
          // Can't count without password, estimate
          fileCount += 3; // Assume some section files
        }
      } catch {}

      setRepoInfo({
        owner: detected.owner,
        repo: detected.repo,
        branch: defaultBranch,
        lastModified,
        fileCount,
      });

      setStep('password');

    } catch (err) {
      console.error('Connection error:', err);
      setError('Connection failed. Please check your network.');
      setStep('token');
    }
  };

  // Step 2: Restore with password
  const handleRestore = async () => {
    if (!password.trim()) {
      setError('Please enter your master password');
      return;
    }

    if (!repoInfo) {
      setError('Repository info missing');
      return;
    }

    setStep('restoring');
    setError(null);

    try {
      // Derive key from password for session
      const key = await deriveKey(password, crypto.getRandomValues(new Uint8Array(16)));
      setSessionKey(key, password);

      // Fetch and decrypt workspaces
      const workspacesFile = await fetchGitHubFile(
        repoInfo.owner,
        repoInfo.repo,
        'data/workspaces.enc.json',
        repoInfo.branch,
        token
      );

      if (!workspacesFile) {
        throw new Error('Failed to fetch workspaces file');
      }

      let workspacesData: unknown;
      try {
        const encryptedData = JSON.parse(workspacesFile.content) as EncryptedData;
        if (encryptedData.algorithm !== 'AES-256-GCM') {
          throw new Error('Invalid encryption format');
        }
        workspacesData = await decrypt(encryptedData, password);
      } catch (decryptErr) {
        throw new Error('Failed to decrypt data. Wrong password?');
      }

      // Fetch and decrypt sections
      const sectionsFile = await fetchGitHubFile(
        repoInfo.owner,
        repoInfo.repo,
        'data/sections.enc.json',
        repoInfo.branch,
        token
      );

      let sectionsData: any[] = [];
      if (sectionsFile) {
        try {
          const encryptedData = JSON.parse(sectionsFile.content) as EncryptedData;
          sectionsData = await decrypt(encryptedData, password);
        } catch {}
      }

      // Save to localStorage
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspacesData));
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sectionsData));

      // Fetch and decrypt section items
      let itemsCount = 0;
      for (const section of sectionsData) {
        const sectionFile = await fetchGitHubFile(
          repoInfo.owner,
          repoInfo.repo,
          `data/${section.workspaceId}/${section.id}.json`,
          repoInfo.branch,
          token
        );

        if (sectionFile) {
          try {
            const encryptedData = JSON.parse(sectionFile.content) as EncryptedData;
            if (encryptedData.algorithm === 'AES-256-GCM') {
              const items = await decrypt(encryptedData, password);
              localStorage.setItem(`section-data-${section.id}`, JSON.stringify(items));
              itemsCount += Array.isArray(items) ? items.length : 1;
            }
          } catch {
            console.warn(`Failed to decrypt section ${section.id}`);
          }
        }
      }

      // Fetch metadata for version
      const metadataFile = await fetchGitHubFile(
        repoInfo.owner,
        repoInfo.repo,
        'data/metadata.json',
        repoInfo.branch,
        token
      );

      if (metadataFile) {
        try {
          const metadata = JSON.parse(metadataFile.content);
          if (metadata.version) {
            localStorage.setItem(SYNC_VERSION_KEY, String(metadata.version));
          }
        } catch {}
      }

      // Setup encryption locally
      const { hash, salt } = await generatePasswordHash(password);
      savePasswordHash(hash, salt);
      markEncryptionSetUp();

      // Create a vault entry (encrypted empty object for verification)
      const vault = await encrypt({ initialized: true, createdAt: new Date().toISOString() }, password);
      saveEncryptedVault(vault);

      // Save repo config (encrypt token)
      const encryptedToken = await encrypt({ token }, password);
      const config = {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: repoInfo.branch,
        dataPath: 'data',
        encryptedToken,
        encryptionEnabled: true,
        lastSyncAt: new Date().toISOString(),
      };
      localStorage.setItem(REPO_SYNC_CONFIG_KEY, JSON.stringify(config));

      // Stats
      const workspaces = workspacesData as any[];
      setRestoredStats({
        workspaces: workspaces?.length || 0,
        sections: sectionsData.length,
        items: itemsCount,
      });

      setStep('success');

    } catch (err) {
      console.error('Restore error:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore data');
      setStep('password');
    }
  };

  // Token step
  if (step === 'token' || step === 'check') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Github className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Restore from GitHub</h2>
            <p className="mt-1 text-sm text-zinc-400">Step 1 of 2: Connect Repository</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 pr-12 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Token needs 'repo' scope to access private repositories
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onBack}
                disabled={step === 'check'}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={step === 'check' || !token.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {step === 'check' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Connect & Check
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password step
  if (step === 'password' || step === 'restoring') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Found Encrypted Data</h2>
            <p className="mt-1 text-sm text-zinc-400">Step 2 of 2: Enter Master Password</p>
          </div>

          {/* Repo info */}
          {repoInfo && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-100">
                    {repoInfo.owner}/{repoInfo.repo}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {repoInfo.fileCount} encrypted files
                    </span>
                    {repoInfo.lastModified && (
                      <span className="flex items-center gap-1">
                        Modified: {new Date(repoInfo.lastModified).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 pr-12 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleRestore()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-400/80">
                <Shield className="inline h-3 w-3 mr-1" />
                Use the SAME password that was used to encrypt the data
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('token')}
                disabled={step === 'restoring'}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleRestore}
                disabled={step === 'restoring' || !password.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {step === 'restoring' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Restore Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Data Restored!</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Your encrypted data has been successfully decrypted and loaded
            </p>
          </div>

          {/* Stats */}
          {restoredStats && (
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-100">{restoredStats.workspaces}</div>
                <div className="text-xs text-zinc-500">Workspaces</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-100">{restoredStats.sections}</div>
                <div className="text-xs text-zinc-500">Sections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-100">{restoredStats.items}</div>
                <div className="text-xs text-zinc-500">Items</div>
              </div>
            </div>
          )}

          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Start Using
          </button>
        </div>
      </div>
    );
  }

  return null;
}
