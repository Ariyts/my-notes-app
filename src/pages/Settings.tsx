import { useState, useEffect } from 'react';
import {
  Download,
  Info,
  Keyboard,
  Smartphone,
  HardDrive,
  RefreshCw,
  Check,
  Rocket,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';
import { useData } from '../lib/DataContext';
import { syncToRepository, validateToken, getRepoInfo } from '../lib/repoSync';

export function Settings() {
  const { data, getChangelog, resetToPublished, exportForPublish } = useData();
  
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'none'>(
    'checking'
  );

  // Repository sync state
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [tokenUser, setTokenUser] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const repoInfo = getRepoInfo();
  const changelog = getChangelog();

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwStatus(reg ? 'active' : 'none');
      });
    } else {
      setSwStatus('none');
    }
  }, []);

  const handleExport = () => {
    const dataExport = exportForPublish();
    const blob = new Blob([JSON.stringify(dataExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pentest-hub-backup-${
      new Date().toISOString().split('T')[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Backup exported successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      setMessage({
        type: 'success',
        text: 'Cache cleared! Refreshing...',
      });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleValidateToken = async () => {
    if (!githubToken.trim()) {
      setTokenUser(null);
      return;
    }

    setIsValidatingToken(true);
    const result = await validateToken(githubToken);
    setIsValidatingToken(false);

    if (result.valid && result.user) {
      setTokenUser(result.user);
      setMessage({ type: 'success', text: `Authenticated as @${result.user}` });
    } else {
      setTokenUser(null);
      setMessage({ type: 'error', text: result.error || 'Invalid token' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePublish = async () => {
    if (!githubToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter a GitHub token' });
      return;
    }

    if (!changelog.hasChanges) {
      setMessage({ type: 'info', text: 'No changes to publish' });
      return;
    }

    setIsSyncing(true);
    setSyncProgress('Validating token...');

    const tokenResult = await validateToken(githubToken);
    if (!tokenResult.valid) {
      setMessage({
        type: 'error',
        text: tokenResult.error || 'Invalid GitHub token',
      });
      setIsSyncing(false);
      setSyncProgress(null);
      return;
    }

    setSyncProgress('Preparing data...');

    try {
      const exportData = exportForPublish();
      const result = await syncToRepository(
        exportData,
        githubToken,
        (status) => setSyncProgress(status)
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Published! Site rebuilding in 2-3 minutes. ${result.commitUrl ? `Commit: ${result.commitSha}` : ''}`,
        });

        // Clear token after successful publish
        setGithubToken('');
        setTokenUser(null);
        setShowChangelog(false);
        
        // Reset to show new published state
        window.location.reload();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to publish',
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setMessage({
        type: 'error',
        text: `Error: ${errorMessage}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const stats = {
    prompts: data.prompts.length,
    notes: data.notes.length,
    snippets: data.snippets.length,
    resources: data.resources.length,
  };

  const totalSize = () => {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage.getItem(key)?.length || 0;
      }
    }
    return (size / 1024).toFixed(2);
  };

  const getChangeIcon = (type: 'added' | 'modified' | 'deleted') => {
    switch (type) {
      case 'added':
        return <Plus className="h-3 w-3 text-emerald-400" />;
      case 'modified':
        return <Edit3 className="h-3 w-3 text-amber-400" />;
      case 'deleted':
        return <Minus className="h-3 w-3 text-red-400" />;
    }
  };

  const getChangeColor = (type: 'added' | 'modified' | 'deleted') => {
    switch (type) {
      case 'added':
        return 'text-emerald-400';
      case 'modified':
        return 'text-amber-400';
      case 'deleted':
        return 'text-red-400';
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500">
          Manage your Pentest Hub data and preferences
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400'
              : message.type === 'info'
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Repository Sync */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Repository Sync
          </h2>
        </div>

        {/* Changelog Section */}
        {changelog.hasChanges && (
          <div className="mb-4 rounded-lg bg-zinc-800/50 p-4">
            <button
              onClick={() => setShowChangelog(!showChangelog)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-300">
                  Changes to publish:
                </span>
                <div className="flex gap-2 text-xs">
                  {changelog.summary.added > 0 && (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">
                      +{changelog.summary.added} added
                    </span>
                  )}
                  {changelog.summary.modified > 0 && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
                      ~{changelog.summary.modified} modified
                    </span>
                  )}
                  {changelog.summary.deleted > 0 && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">
                      -{changelog.summary.deleted} deleted
                    </span>
                  )}
                </div>
              </div>
              <RefreshCw
                className={`h-4 w-4 text-zinc-500 transition-transform ${
                  showChangelog ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showChangelog && (
              <div className="mt-3 space-y-3 border-t border-zinc-700 pt-3">
                {/* Prompts changes */}
                {changelog.prompts.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                      Prompts
                    </h4>
                    <div className="space-y-1">
                      {changelog.prompts.map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {getChangeIcon(change.type)}
                          <span className="text-zinc-300">{change.title}</span>
                          <span className={`text-xs ${getChangeColor(change.type)}`}>
                            ({change.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes changes */}
                {changelog.notes.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                      Notes
                    </h4>
                    <div className="space-y-1">
                      {changelog.notes.map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {getChangeIcon(change.type)}
                          <span className="text-zinc-300">{change.title}</span>
                          {change.category && (
                            <span className="text-xs text-zinc-500">
                              [{change.category}]
                            </span>
                          )}
                          <span className={`text-xs ${getChangeColor(change.type)}`}>
                            ({change.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Snippets changes */}
                {changelog.snippets.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                      Snippets
                    </h4>
                    <div className="space-y-1">
                      {changelog.snippets.map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {getChangeIcon(change.type)}
                          <span className="text-zinc-300">{change.title}</span>
                          <span className={`text-xs ${getChangeColor(change.type)}`}>
                            ({change.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources changes */}
                {changelog.resources.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                      Resources
                    </h4>
                    <div className="space-y-1">
                      {changelog.resources.map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {getChangeIcon(change.type)}
                          <span className="text-zinc-300">{change.title}</span>
                          <span className={`text-xs ${getChangeColor(change.type)}`}>
                            ({change.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!changelog.hasChanges && (
          <div className="mb-4 rounded-lg bg-zinc-800/30 p-4 text-sm text-zinc-500">
            ✓ No unsaved changes. Current data matches published version.
          </div>
        )}

        {/* Current data counts */}
        <div className="mb-4 rounded-lg bg-zinc-800/50 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-300">
            Current data:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded bg-zinc-700/50 px-3 py-2">
              <span className="text-zinc-300">Notes: {stats.notes}</span>
            </div>
            <div className="flex items-center gap-2 rounded bg-zinc-700/50 px-3 py-2">
              <span className="text-zinc-300">Prompts: {stats.prompts}</span>
            </div>
            <div className="flex items-center gap-2 rounded bg-zinc-700/50 px-3 py-2">
              <span className="text-zinc-300">Snippets: {stats.snippets}</span>
            </div>
            <div className="flex items-center gap-2 rounded bg-zinc-700/50 px-3 py-2">
              <span className="text-zinc-300">Resources: {stats.resources}</span>
            </div>
          </div>
        </div>

        {/* Token input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            GitHub Personal Access Token
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? 'text' : 'password'}
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  setTokenUser(null);
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-lg bg-zinc-800 py-2 pl-3 pr-10 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={handleValidateToken}
              disabled={!githubToken.trim() || isValidatingToken}
              className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
            >
              {isValidatingToken ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Verify
            </button>
          </div>
          {tokenUser && (
            <p className="mt-1 text-xs text-emerald-400">
              ✓ Authenticated as @{tokenUser}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            Token needs{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5">repo</code>{' '}
            scope. Create at{' '}
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              github.com/settings/tokens/new
              <ExternalLink className="ml-1 inline h-3 w-3" />
            </a>
          </p>
        </div>

        {/* Publish button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePublish}
            disabled={isSyncing || !githubToken.trim() || !changelog.hasChanges}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Publish & Rebuild
              </>
            )}
          </button>

          {syncProgress && (
            <span className="text-sm text-zinc-400">{syncProgress}</span>
          )}

          <button
            onClick={resetToPublished}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Changes
          </button>
        </div>

        {/* Repo info */}
        <div className="mt-4 rounded-lg bg-zinc-800/30 p-3 text-xs text-zinc-500">
          <div className="flex items-center justify-between">
            <span>
              Repository:{' '}
              <a
                href={repoInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-emerald-400"
              >
                {repoInfo.owner}/{repoInfo.repo}
              </a>
            </span>
          </div>
          <p className="mt-1">
            ⚠️ This will update the site for all users. Rebuild takes ~2-3
            minutes.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Data Statistics
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.prompts}
            </div>
            <div className="text-sm text-zinc-400">Prompts</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.notes}</div>
            <div className="text-sm text-zinc-400">Notes</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats.snippets}
            </div>
            <div className="text-sm text-zinc-400">Snippets</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats.resources}
            </div>
            <div className="text-sm text-zinc-400">Resources</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Local storage used:{' '}
            <span className="text-zinc-300">{totalSize()} KB</span>
          </span>
          <span className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            preferences only
          </span>
        </div>
      </div>

      {/* PWA & Offline Status */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">PWA & Offline</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Service Worker</span>
              {swStatus === 'checking' ? (
                <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
              ) : swStatus === 'active' ? (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Active
                </span>
              ) : (
                <span className="text-sm text-zinc-500">Not available</span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Enables offline functionality
            </p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">PWA Mode</span>
              {isPWAInstalled ? (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Installed
                </span>
              ) : (
                <span className="text-sm text-zinc-500">Not installed</span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {isPWAInstalled
                ? 'Running as standalone app'
                : 'Add to home screen for app-like experience'}
            </p>
          </div>
        </div>
        {swStatus === 'active' && (
          <button
            onClick={handleClearCache}
            className="mt-4 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Clear offline cache
          </button>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Keyboard Shortcuts
          </h2>
        </div>
        <div className="grid gap-2">
          {[
            { keys: 'Ctrl + K', action: 'Open global search' },
            { keys: 'Ctrl + S', action: 'Save current note' },
            { keys: 'Escape', action: 'Close modal / search' },
          ].map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-2"
            >
              <span className="text-zinc-300">{shortcut.action}</span>
              <kbd className="rounded bg-zinc-700 px-2 py-1 text-xs font-mono text-zinc-400">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Backup & Restore
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Export JSON Backup
          </button>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          Export current session data as JSON. Note: Data is only stored in
          memory and will be lost when you close the page unless published.
        </p>
      </div>

      {/* About */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">About</h2>
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          Pentest Hub — Personal penetration testing knowledge base.
          <br />
          Data is stored in memory during session. Use Repository Sync to
          publish changes for all users.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="rounded bg-zinc-800 px-2 py-1">Version 3.0.0</span>
          <span className="rounded bg-zinc-800 px-2 py-1">PWA Ready</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Memory Storage</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Repo Sync</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Changelog</span>
        </div>
      </div>
    </div>
  );
}
