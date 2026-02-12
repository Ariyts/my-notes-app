import { useState, useEffect } from 'react';
import { 
  Trash2, Download, Upload, AlertTriangle, Info, Keyboard, 
  Cloud, History, Smartphone, HardDrive, RefreshCw, Check
} from 'lucide-react';
import { storageEnhanced, gistSync } from '../lib/storage-enhanced';

export function Settings() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'none'>('checking');

  useEffect(() => {
    // Check PWA status
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true);
    }
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSwStatus(reg ? 'active' : 'none');
      });
    } else {
      setSwStatus('none');
    }
  }, []);

  const handleExport = () => {
    const data = storageEnhanced.exportAll();
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!confirm('This will REPLACE all current data. Continue?')) return;
        storageEnhanced.importAll(data);
        setMessage({ type: 'success', text: 'Import successful! Refreshing...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setMessage({ type: 'error', text: 'Invalid backup file format' });
        setTimeout(() => setMessage(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    storageEnhanced.clearAll();
    setShowClearConfirm(false);
    setMessage({ type: 'success', text: 'All data cleared. Refreshing...' });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      setMessage({ type: 'success', text: 'Cache cleared! Refreshing...' });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const stats = {
    prompts: storageEnhanced.prompts.getAll().length,
    notes: storageEnhanced.notes.getAll().length,
    snippets: storageEnhanced.snippets.getAll().length,
    resources: storageEnhanced.resources.getAll().length,
  };

  const gistConfig = gistSync.getConfig();

  const totalSize = () => {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage.getItem(key)?.length || 0;
      }
    }
    return (size / 1024).toFixed(2);
  };

  const historyCount = () => {
    const history = localStorage.getItem('pentest_history');
    return history ? JSON.parse(history).length : 0;
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500">Manage your Pentest Hub data and preferences</p>
      </div>

      {message && (
        <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Storage Statistics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.prompts}</div>
            <div className="text-sm text-zinc-400">Prompts</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.notes}</div>
            <div className="text-sm text-zinc-400">Notes</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.snippets}</div>
            <div className="text-sm text-zinc-400">Snippets</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.resources}</div>
            <div className="text-sm text-zinc-400">Resources</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-pink-400">{historyCount()}</div>
            <div className="text-sm text-zinc-400">Versions</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>Total storage used: <span className="text-zinc-300">{totalSize()} KB</span></span>
          <span className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            localStorage
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
            <p className="mt-1 text-xs text-zinc-500">Enables offline functionality</p>
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
              {isPWAInstalled ? 'Running as standalone app' : 'Add to home screen for app-like experience'}
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

      {/* Gist Sync Status */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-zinc-100">GitHub Gist Sync</h2>
        </div>
        <div className="rounded-lg bg-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-300">
                {gistConfig.gistId ? 'Connected' : 'Not connected'}
              </span>
              {gistConfig.lastSync && (
                <p className="text-xs text-zinc-500">
                  Last sync: {new Date(gistConfig.lastSync).toLocaleString()}
                </p>
              )}
            </div>
            {gistConfig.gistId ? (
              <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
                <Check className="h-4 w-4" /> Synced
              </span>
            ) : (
              <span className="text-sm text-zinc-500">Configure in sidebar</span>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Sync your encrypted data to a private GitHub Gist for backup and cross-device access.
        </p>
      </div>

      {/* Version History */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Version History</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Pentest Hub automatically saves previous versions of your notes and prompts when you edit them.
          You can restore any previous version from the History panel.
        </p>
        <div className="mt-4 rounded-lg bg-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300">Saved versions</span>
            <span className="text-xl font-bold text-purple-400">{historyCount()}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Up to 50 versions per item are kept</p>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
        </div>
        <div className="grid gap-2">
          {[
            { keys: '⌘/Ctrl + K', action: 'Open global search' },
            { keys: '⌘/Ctrl + S', action: 'Save current note' },
            { keys: 'Escape', action: 'Close modal / search' },
            { keys: 'Drag handle', action: 'Reorder prompts' },
          ].map(shortcut => (
            <div key={shortcut.keys} className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-2">
              <span className="text-zinc-300">{shortcut.action}</span>
              <kbd className="rounded bg-zinc-700 px-2 py-1 text-xs font-mono text-zinc-400">{shortcut.keys}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Backup & Restore</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Export JSON Backup
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
            <Upload className="h-4 w-4" />
            Import Backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          Export your data as JSON for backup or transfer to another device.
          Includes prompts, notes, snippets, resources, and custom order.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="mb-4 flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Danger Zone</h2>
        </div>
        
        {showClearConfirm ? (
          <div className="rounded-lg bg-red-500/10 p-4">
            <p className="mb-4 text-zinc-300">
              This will permanently delete ALL your prompts, notes, snippets, resources, and version history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-transparent px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>
        )}
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
          All data is stored locally in your browser with optional encrypted cloud sync.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="rounded bg-zinc-800 px-2 py-1">Version 2.0.0</span>
          <span className="rounded bg-zinc-800 px-2 py-1">PWA Ready</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Offline Support</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Gist Sync</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Version History</span>
        </div>
      </div>
    </div>
  );
}
