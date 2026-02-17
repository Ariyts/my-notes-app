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
  Lock,
  Shield,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
  FileDown,
} from 'lucide-react';
import { RepositorySync } from '../components/sync/RepositorySync';
import { ChangePasswordModal } from '../components/security/ChangePasswordModal';
import {
  isEncryptionSetUp,
  isSessionActive,
  clearEncryptionData,
  getSessionPassword,
  encrypt,
  saveEncryptedVault,
  loadEncryptedVault,
  decrypt,
} from '../lib/crypto';

export function Settings() {
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'none'>('checking');
  
  // Encryption state
  const [encryptionEnabled, setEncryptionEnabled] = useState(isEncryptionSetUp());
  const [sessionActive, setSessionActive] = useState(isSessionActive());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    
    // Update encryption status
    setEncryptionEnabled(isEncryptionSetUp());
    setSessionActive(isSessionActive());
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
  
  // Export decrypted backup (requires password)
  const handleExportDecrypted = async () => {
    if (!encryptionEnabled) {
      // Not encrypted - just export
      handleExport();
      return;
    }
    
    const password = getSessionPassword();
    if (!password) {
      setMessage({ type: 'error', text: 'Unlock vault first to export decrypted data' });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const vault = loadEncryptedVault();
      if (!vault) {
        setMessage({ type: 'error', text: 'No encrypted vault found' });
        setIsProcessing(false);
        return;
      }
      
      // Decrypt
      const decryptedData = await decrypt(vault, password);
      
      // Export
      const blob = new Blob([JSON.stringify(decryptedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pentest-hub-decrypted-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Decrypted backup exported! ⚠️ This file is NOT encrypted!' });
    } catch (err) {
      console.error('Failed to export decrypted:', err);
      setMessage({ type: 'error', text: 'Failed to export decrypted data' });
    } finally {
      setIsProcessing(false);
    }
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
  
  // Setup encryption
  const handleSetupEncryption = async () => {
    if (!setupPassword || setupPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    
    setIsProcessing(true);
    setMessage(null);
    
    try {
      // Gather all data
      const workspaces = JSON.parse(localStorage.getItem('pentest-hub-workspaces') || '[]');
      const sections = JSON.parse(localStorage.getItem('pentest-hub-sections') || '[]');
      
      const items: Record<string, unknown[]> = {};
      sections.forEach((s: { id: string }) => {
        items[s.id] = JSON.parse(localStorage.getItem(`section-data-${s.id}`) || '[]');
      });
      
      const allData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workspaces,
        sections,
        items,
      };
      
      // Encrypt
      const encrypted = await encrypt(allData, setupPassword);
      saveEncryptedVault(encrypted);
      
      setEncryptionEnabled(true);
      setShowSetupModal(false);
      setSetupPassword('');
      setMessage({ type: 'success', text: 'Encryption enabled! Your data is now protected.' });
    } catch (err) {
      console.error('Failed to setup encryption:', err);
      setMessage({ type: 'error', text: 'Failed to setup encryption' });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Remove encryption
  const handleRemoveEncryption = async () => {
    setIsProcessing(true);
    setMessage(null);
    
    try {
      // Check if we can decrypt
      const vault = loadEncryptedVault();
      if (vault) {
        const password = getSessionPassword();
        if (!password) {
          setMessage({ type: 'error', text: 'Unlock vault first to remove encryption' });
          setIsProcessing(false);
          return;
        }
        
        // Decrypt and verify data is safe
        await decrypt(vault, password);
      }
      
      // Clear encryption data
      clearEncryptionData();
      
      setEncryptionEnabled(false);
      setSessionActive(false);
      setShowRemoveModal(false);
      setMessage({ type: 'info', text: 'Encryption removed. Data is now stored unencrypted.' });
    } catch (err) {
      console.error('Failed to remove encryption:', err);
      setMessage({ type: 'error', text: 'Failed to remove encryption' });
    } finally {
      setIsProcessing(false);
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
          className={`flex items-center gap-2 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400'
              : message.type === 'info'
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {message.type === 'success' && <Check className="h-4 w-4" />}
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'info' && <Info className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Security & Encryption */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Security</h2>
            <p className="text-sm text-zinc-500">AES-256-GCM encryption • Auto-lock: 15 min</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <Lock className={cn("h-5 w-5", encryptionEnabled ? "text-emerald-400" : "text-zinc-500")} />
              <div>
                <div className="font-medium text-zinc-100">
                  {encryptionEnabled ? 'Encryption Enabled' : 'Encryption Disabled'}
                </div>
                <div className="text-xs text-zinc-500">
                  {encryptionEnabled 
                    ? sessionActive 
                      ? 'Vault is unlocked • Auto-lock active' 
                      : 'Vault is locked'
                    : 'Your data is stored in plain text'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!encryptionEnabled ? (
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  <Lock className="h-4 w-4" />
                  Setup Encryption
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    disabled={!sessionActive}
                    className="flex items-center gap-2 rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change
                  </button>
                  <button
                    onClick={() => setShowRemoveModal(true)}
                    disabled={!sessionActive}
                    className="flex items-center gap-2 rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {encryptionEnabled && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Shield className="h-4 w-4" />
                Your data is encrypted with AES-256-GCM
              </div>
              <p className="text-xs text-emerald-400/70 mt-1">
                Auto-lock after 15 minutes of inactivity. 
                Even if someone gains access to your repository or localStorage, 
                they cannot read your data without the master password.
              </p>
            </div>
          )}
        </div>
      </div>

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
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Export Backup
          </button>
          {encryptionEnabled && (
            <button
              onClick={handleExportDecrypted}
              disabled={isProcessing || !sessionActive}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              Export Decrypted
            </button>
          )}
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          {encryptionEnabled ? (
            <>
              <strong>Export Backup</strong> — exports encrypted data (safe to store).
              <br />
              <strong>Export Decrypted</strong> — exports plain text (⚠️ NOT secure, requires unlock).
            </>
          ) : (
            'Export all data as JSON backup. Use Repository Sync for cross-device sync.'
          )}
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
          <span className="rounded bg-zinc-800 px-2 py-1">Version 4.2.0</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Workspaces</span>
          <span className="rounded bg-zinc-800 px-2 py-1">AES-256 Encryption</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Auto-Lock</span>
          <span className="rounded bg-zinc-800 px-2 py-1">Repository Sync</span>
          <span className="rounded bg-zinc-800 px-2 py-1">PWA Ready</span>
        </div>
      </div>
      
      {/* Setup Encryption Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-zinc-100">Setup Encryption</h2>
              </div>
              <button 
                onClick={() => setShowSetupModal(false)} 
                className="text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            </div>
            
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-zinc-400">
                Create a master password to encrypt your data. 
                This password will be required to unlock the vault.
              </p>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Enter master password"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-3 px-4 pr-11 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  WARNING
                </div>
                <p className="text-xs text-amber-400/80 mt-1">
                  If you forget this password, your data cannot be recovered!
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                onClick={() => setShowSetupModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSetupEncryption}
                disabled={isProcessing || setupPassword.length < 8}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Enable Encryption
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Remove Encryption Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-lg font-bold">Remove Encryption</h2>
              </div>
              <button 
                onClick={() => setShowRemoveModal(false)} 
                className="text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            </div>
            
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-zinc-300">
                This will decrypt and store your data in plain text.
              </p>
              
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  SECURITY WARNING
                </div>
                <ul className="text-xs text-red-400/80 mt-2 space-y-1">
                  <li>• Your data will be stored unencrypted</li>
                  <li>• Anyone with access can read it</li>
                  <li>• Data in repository will be visible</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveEncryption}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove Encryption
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
          }}
        />
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
