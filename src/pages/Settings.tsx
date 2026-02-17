import { useState, useEffect } from 'react';
import {
  Download,
  Info,
  Keyboard,
  Smartphone,
  HardDrive,
  RefreshCw,
  Check,
  Loader2,
} from 'lucide-react';
import { RepositorySync } from '../components/sync/RepositorySync';

export function Settings() {
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'none'>('checking');

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
    // Export all localStorage data
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pentest-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
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

  // Calculate total storage size
  const totalSize = () => {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage.getItem(key)?.length || 0;
      }
    }
    return (size / 1024).toFixed(2);
  };

  // Count items in storage
  const countItems = (key: string): number => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  };

  const stats = {
    prompts: countItems('pentest_prompts'),
    notes: countItems('pentest_notes'),
    snippets: countItems('pentest_snippets'),
    resources: countItems('pentest_resources'),
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <RepositorySync />
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
            Browser storage
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
          Export all data as JSON backup. Use Repository Sync for cross-device sync.
        </p>
      </div>

      {/* About */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">About</h2>
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          Pentest Hub — Personal penetration testing knowledge base with workspaces support.
          <br />
          Data is stored in browser localStorage. Use Repository Sync for backup.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="rounded bg-zinc-800 px-2 py-1">Version 4.0.0</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Workspaces</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Repository Sync</span>
          <span className="rounded bg-zinc-800 px-2 py-1">PWA Ready</span>
        </div>
      </div>
    </div>
  );
}
