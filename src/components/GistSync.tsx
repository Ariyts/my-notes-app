import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Upload, Download, Settings, Check, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { gistSync, GistConfig } from '../lib/storage-enhanced';
import { cn } from '../utils/cn';
import { formatDistanceToNow } from 'date-fns';

interface GistSyncProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GistSync({ isOpen, onClose }: GistSyncProps) {
  const [config, setConfig] = useState<GistConfig>({ token: '', gistId: null, lastSync: null, autoSync: false });
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'pushing' | 'pulling' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedConfig = gistSync.getConfig();
      setConfig(savedConfig);
      setToken(savedConfig.token);
    }
  }, [isOpen]);

  const handleSaveToken = () => {
    const newConfig = { ...config, token };
    gistSync.saveConfig(newConfig);
    setConfig(newConfig);
    setMessage('Token saved!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handlePush = async () => {
    if (!password) {
      setMessage('Please enter encryption password');
      return;
    }
    
    setStatus('pushing');
    setMessage('');
    
    const result = await gistSync.push(password);
    
    if (result.success) {
      setStatus('success');
      setMessage('Data pushed to Gist successfully!');
      setConfig(gistSync.getConfig());
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to push');
    }
    
    setTimeout(() => setStatus('idle'), 3000);
  };

  const handlePull = async () => {
    if (!password) {
      setMessage('Please enter decryption password');
      return;
    }
    
    if (!confirm('This will REPLACE all local data with data from Gist. Continue?')) {
      return;
    }
    
    setStatus('pulling');
    setMessage('');
    
    const result = await gistSync.pull(password);
    
    if (result.success && result.data) {
      gistSync.applyPulledData(result.data);
      setStatus('success');
      setMessage('Data pulled successfully! Refreshing...');
      setConfig(gistSync.getConfig());
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to pull');
    }
    
    setTimeout(() => setStatus('idle'), 3000);
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect from Gist? Local data will remain.')) {
      gistSync.saveConfig({ token: '', gistId: null, lastSync: null, autoSync: false });
      setConfig({ token: '', gistId: null, lastSync: null, autoSync: false });
      setToken('');
      setMessage('Disconnected from Gist');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold text-zinc-100">GitHub Gist Sync</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Message */}
          {message && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg p-3 text-sm",
              status === 'success' ? "bg-emerald-500/10 text-emerald-400" :
              status === 'error' ? "bg-red-500/10 text-red-400" :
              "bg-blue-500/10 text-blue-400"
            )}>
              {status === 'success' ? <Check className="h-4 w-4" /> :
               status === 'error' ? <AlertCircle className="h-4 w-4" /> :
               <Cloud className="h-4 w-4" />}
              {message}
            </div>
          )}

          {/* Connection Status */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.gistId ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Cloud className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-100">Connected</div>
                      <div className="text-xs text-zinc-500">
                        Gist ID: {config.gistId.slice(0, 8)}...
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
                      <CloudOff className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-100">Not Connected</div>
                      <div className="text-xs text-zinc-500">Configure GitHub token below</div>
                    </div>
                  </>
                )}
              </div>
              {config.gistId && (
                <a
                  href={`https://gist.github.com/${config.gistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  View Gist <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {config.lastSync && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <RefreshCw className="h-3 w-3" />
                Last synced {formatDistanceToNow(new Date(config.lastSync), { addSuffix: true })}
              </div>
            )}
          </div>

          {/* Token Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-400">GitHub Personal Access Token</label>
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=Pentest%20Hub%20Sync"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                Create token →
              </a>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                onClick={handleSaveToken}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              Required scope: <code className="text-zinc-500">gist</code>. Token is stored locally only.
            </p>
          </div>

          {/* Encryption Password */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">Encryption Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password for encryption/decryption"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-xs text-zinc-600">
              Your data is encrypted before upload. Remember this password!
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePush}
              disabled={!token || !password || status === 'pushing' || status === 'pulling'}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'pushing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Push to Gist
            </button>
            <button
              onClick={handlePull}
              disabled={!token || !password || !config.gistId || status === 'pushing' || status === 'pulling'}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'pulling' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Pull from Gist
            </button>
          </div>

          {/* Disconnect */}
          {config.gistId && (
            <button
              onClick={handleDisconnect}
              className="w-full text-center text-sm text-red-400 hover:text-red-300"
            >
              Disconnect from Gist
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-600">
          <Settings className="inline h-3 w-3 mr-1" />
          Data is encrypted with AES before syncing. Only you can decrypt it.
        </div>
      </div>
    </div>
  );
}
