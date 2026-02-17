/**
 * Repository Sync Component
 * 
 * Advanced GitHub repository synchronization with:
 * - Change preview before commit
 * - Repository selection via token
 * - Pull/Push functionality
 */

import { useState, useEffect } from 'react';
import {
  Github,
  RefreshCw,
  Upload,
  Download,
  Check,
  X,
  Plus,
  Minus,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Trash2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Types
interface RepoSyncConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  dataPath: string;
  lastSyncSha?: string;
  lastSyncAt?: string;
}

interface SyncChange {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'unchanged';
  additions?: number;
  deletions?: number;
  selected: boolean;
  localSize?: number;
  remoteSize?: number;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
}

// Storage key
const REPO_SYNC_CONFIG_KEY = 'pentest-hub-repo-sync-config';

// Load/save config
function loadConfig(): RepoSyncConfig | null {
  try {
    const data = localStorage.getItem(REPO_SYNC_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveConfig(config: RepoSyncConfig): void {
  localStorage.setItem(REPO_SYNC_CONFIG_KEY, JSON.stringify(config));
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Props
interface RepositorySyncProps {
  onDataChange?: () => void;
  onSyncComplete?: () => void;
}

export function RepositorySync({ onDataChange, onSyncComplete }: RepositorySyncProps) {
  // State
  const [config, setConfig] = useState<RepoSyncConfig | null>(loadConfig);
  const [showConnectModal, setShowConnectModal] = useState(!config?.token);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [showChanges, setShowChanges] = useState(false);
  
  // Token validation state
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [tokenUser, setTokenUser] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [dataPath, setDataPath] = useState('data');
  const [loadingRepos, setLoadingRepos] = useState(false);
  
  // Load config on mount
  useEffect(() => {
    const saved = loadConfig();
    if (saved) {
      setConfig(saved);
      setShowConnectModal(!saved.token);
    }
  }, []);
  
  // Validate token and load repos
  const handleValidateToken = async () => {
    if (!token.trim()) return;
    
    setIsValidating(true);
    setSyncMessage(null);
    
    try {
      // Validate token
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      
      if (!userRes.ok) {
        setSyncMessage({ type: 'error', text: 'Invalid token' });
        setIsValidating(false);
        return;
      }
      
      const user = await userRes.json();
      setTokenUser(user.login);
      
      // Load repos
      setLoadingRepos(true);
      const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setRepos(reposData);
        setSyncMessage({ type: 'success', text: `Found ${reposData.length} repositories` });
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: 'Failed to validate token' });
    } finally {
      setIsValidating(false);
      setLoadingRepos(false);
    }
  };
  
  // Connect to repository
  const handleConnect = () => {
    if (!token || !selectedRepo) return;
    
    const [owner, repo] = selectedRepo.split('/');
    const newConfig: RepoSyncConfig = {
      token,
      owner,
      repo,
      branch,
      dataPath: dataPath.startsWith('/') ? dataPath.slice(1) : dataPath,
    };
    
    saveConfig(newConfig);
    setConfig(newConfig);
    setShowConnectModal(false);
    setSyncMessage({ type: 'success', text: `Connected to ${selectedRepo}` });
  };
  
  // Disconnect
  const handleDisconnect = () => {
    localStorage.removeItem(REPO_SYNC_CONFIG_KEY);
    setConfig(null);
    setToken('');
    setTokenUser(null);
    setRepos([]);
    setSelectedRepo('');
    setShowConnectModal(true);
  };
  
  // Detect changes
  const detectChanges = async () => {
    if (!config) return;
    
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Detecting changes...' });
    
    try {
      // Get current data from localStorage
      const localData: Record<string, string> = {};
      const files = ['prompts', 'notes', 'snippets', 'resources', 'content-types', 'workspaces', 'sections'];
      
      files.forEach(file => {
        const key = file === 'content-types' ? 'content-types' : file;
        const data = localStorage.getItem(`pentest_${key}`) || localStorage.getItem(key);
        if (data) {
          localData[`${file}.json`] = data;
        }
      });
      
      // Get remote data
      const remoteChanges: SyncChange[] = [];
      
      for (const [filename, content] of Object.entries(localData)) {
        const localSize = new Blob([content]).size;
        
        // Try to get remote file
        const remoteRes = await fetch(
          `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.dataPath}/${filename}?ref=${config.branch}`,
          {
            headers: {
              Authorization: `Bearer ${config.token}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
        
        if (remoteRes.ok) {
          const remoteData = await remoteRes.json();
          const remoteContent = decodeURIComponent(escape(atob(remoteData.content)));
          const remoteSize = new Blob([remoteContent]).size;
          
          if (remoteContent !== content) {
            // Count line changes (rough estimate)
            const localLines = content.split('\n').length;
            const remoteLines = remoteContent.split('\n').length;
            
            remoteChanges.push({
              file: filename,
              status: 'modified',
              additions: Math.max(0, localLines - remoteLines),
              deletions: Math.max(0, remoteLines - localLines),
              selected: true,
              localSize,
              remoteSize,
            });
          } else {
            remoteChanges.push({
              file: filename,
              status: 'unchanged',
              selected: false,
              localSize,
              remoteSize,
            });
          }
        } else {
          // File doesn't exist remotely
          remoteChanges.push({
            file: filename,
            status: 'added',
            additions: content.split('\n').length,
            selected: true,
            localSize,
          });
        }
      }
      
      setChanges(remoteChanges);
      
      const changedCount = remoteChanges.filter(c => c.status !== 'unchanged').length;
      if (changedCount > 0) {
        setSyncMessage({ type: 'info', text: `${changedCount} file(s) changed` });
        setShowChanges(true);
        setCommitMessage(`Sync data - ${new Date().toLocaleDateString()}`);
      } else {
        setSyncMessage({ type: 'success', text: 'No changes detected' });
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: 'Failed to detect changes' });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Toggle file selection
  const toggleFileSelection = (file: string) => {
    setChanges(prev => prev.map(c => 
      c.file === file ? { ...c, selected: !c.selected } : c
    ));
  };
  
  // Push changes
  const handlePush = async () => {
    if (!config) return;
    
    const selectedChanges = changes.filter(c => c.selected && c.status !== 'unchanged');
    if (selectedChanges.length === 0) {
      setSyncMessage({ type: 'info', text: 'No files selected' });
      return;
    }
    
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Pushing changes...' });
    
    try {
      // Get current branch commit
      const branchRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/heads/${config.branch}`,
        {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );
      
      if (!branchRes.ok) throw new Error('Failed to get branch');
      
      const branchData = await branchRes.json();
      const baseTreeSha = branchData.object.sha;
      
      // Get commit tree
      const commitRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/commits/${baseTreeSha}`,
        {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );
      
      const commitData = await commitRes.json();
      const baseTree = commitData.tree.sha;
      
      // Create blobs for each file
      const treeItems = [];
      for (const change of selectedChanges) {
        const key = change.file.replace('.json', '');
        const storageKey = key === 'content-types' ? 'content-types' : 
                           key === 'workspaces' ? 'workspaces' :
                           key === 'sections' ? 'sections' :
                           `pentest_${key}`;
        const content = localStorage.getItem(storageKey) || localStorage.getItem(key);
        
        if (content) {
          // Create blob
          const blobRes = await fetch(
            `https://api.github.com/repos/${config.owner}/${config.repo}/git/blobs`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${config.token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              body: JSON.stringify({ content, encoding: 'utf-8' }),
            }
          );
          
          const blobData = await blobRes.json();
          treeItems.push({
            path: `${config.dataPath}/${change.file}`,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha,
          });
        }
      }
      
      // Create tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            base_tree: baseTree,
            tree: treeItems,
          }),
        }
      );
      
      const treeData = await treeRes.json();
      
      // Create commit
      const newCommitRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/commits`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            message: commitMessage,
            tree: treeData.sha,
            parents: [baseTreeSha],
          }),
        }
      );
      
      const newCommitData = await newCommitRes.json();
      
      // Update branch
      const updateRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/heads/${config.branch}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({ sha: newCommitData.sha }),
        }
      );
      
      if (updateRes.ok) {
        setSyncMessage({ type: 'success', text: `Pushed ${selectedChanges.length} file(s) successfully!` });
        setChanges([]);
        setShowChanges(false);
        
        // Update config
        const updatedConfig = { ...config, lastSyncSha: newCommitData.sha, lastSyncAt: new Date().toISOString() };
        saveConfig(updatedConfig);
        setConfig(updatedConfig);
        
        onSyncComplete?.();
      } else {
        throw new Error('Failed to update branch');
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: `Push failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Pull changes
  const handlePull = async () => {
    if (!config) return;
    
    if (!confirm('This will replace local data with data from repository. Continue?')) return;
    
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Pulling changes...' });
    
    try {
      const files = ['prompts', 'notes', 'snippets', 'resources', 'content-types', 'workspaces', 'sections'];
      let pulledCount = 0;
      
      for (const file of files) {
        const res = await fetch(
          `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.dataPath}/${file}.json?ref=${config.branch}`,
          {
            headers: {
              Authorization: `Bearer ${config.token}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
        
        if (res.ok) {
          const data = await res.json();
          const content = decodeURIComponent(escape(atob(data.content)));
          
          // Save to localStorage
          const key = file === 'content-types' ? 'content-types' : 
                      file === 'workspaces' ? 'workspaces' :
                      file === 'sections' ? 'sections' :
                      `pentest_${file}`;
          localStorage.setItem(key, content);
          pulledCount++;
        }
      }
      
      setSyncMessage({ type: 'success', text: `Pulled ${pulledCount} file(s). Refreshing...` });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      setSyncMessage({ type: 'error', text: 'Failed to pull changes' });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: SyncChange['status']) => {
    switch (status) {
      case 'added': return <Plus className="h-3 w-3 text-emerald-400" />;
      case 'modified': return <Edit3 className="h-3 w-3 text-amber-400" />;
      case 'deleted': return <Minus className="h-3 w-3 text-red-400" />;
      default: return <Check className="h-3 w-3 text-zinc-500" />;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Github className="h-5 w-5 text-zinc-400" />
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Repository Sync</h2>
            {config?.lastSyncAt && (
              <p className="text-xs text-zinc-500">
                Last sync: {new Date(config.lastSyncAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        {config && (
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${config.owner}/${config.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-emerald-400"
            >
              {config.owner}/{config.repo}
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={handleDisconnect}
              className="rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              title="Disconnect"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Status Message */}
      {syncMessage && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg p-3 text-sm",
          syncMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-400" :
          syncMessage.type === 'error' ? "bg-red-500/10 text-red-400" :
          "bg-blue-500/10 text-blue-400"
        )}>
          {syncMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
           syncMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
           <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />}
          {syncMessage.text}
        </div>
      )}
      
      {/* Connection Status */}
      {config ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Github className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-medium text-zinc-100">Connected</div>
                <div className="text-xs text-zinc-500">
                  {config.owner}/{config.repo} ({config.branch})
                </div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Path: {config.dataPath}/
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={detectChanges}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              Check Changes
            </button>
            <button
              onClick={handlePull}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Pull
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConnectModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-8 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Connect Repository
        </button>
      )}
      
      {/* Changes Preview */}
      {changes.length > 0 && showChanges && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 overflow-hidden">
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-zinc-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-300">
                Changes to commit:
              </span>
              <div className="flex gap-2 text-xs">
                {changes.filter(c => c.status === 'added').length > 0 && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">
                    +{changes.filter(c => c.status === 'added').length} added
                  </span>
                )}
                {changes.filter(c => c.status === 'modified').length > 0 && (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
                    ~{changes.filter(c => c.status === 'modified').length} modified
                  </span>
                )}
              </div>
            </div>
          </button>
          
          <div className="border-t border-zinc-700 max-h-[200px] overflow-y-auto">
            {changes.map(change => (
              <div
                key={change.file}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 hover:bg-zinc-800",
                  change.status === 'unchanged' && "opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={change.selected}
                  onChange={() => toggleFileSelection(change.file)}
                  disabled={change.status === 'unchanged'}
                  className="rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                />
                {getStatusIcon(change.status)}
                <FileText className="h-4 w-4 text-zinc-500" />
                <span className="flex-1 text-sm text-zinc-300">{change.file}</span>
                {change.status !== 'unchanged' && (
                  <span className="text-xs text-zinc-500">
                    {change.status === 'added' ? `+${change.additions}` : 
                     `+${change.additions} -${change.deletions}`}
                  </span>
                )}
                <span className="text-xs text-zinc-600">
                  {formatSize(change.localSize || 0)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Commit Message */}
          <div className="border-t border-zinc-700 p-3 space-y-3">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full rounded bg-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setChanges([]); setShowChanges(false); }}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                disabled={isSyncing || !commitMessage.trim() || !changes.some(c => c.selected)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Commit & Push
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-bold text-zinc-100">Connect Repository</h2>
              <button onClick={() => setShowConnectModal(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Token */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  GitHub Personal Access Token
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={(e) => { setToken(e.target.value); setTokenUser(null); setRepos([]); }}
                      placeholder="ghp_..."
                      className="w-full rounded-lg bg-zinc-800 py-2 pl-3 pr-10 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleValidateToken}
                    disabled={!token.trim() || isValidating}
                    className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
                  >
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Verify
                  </button>
                </div>
                {tokenUser && (
                  <p className="mt-1 text-xs text-emerald-400">
                    ✓ Authenticated as @{tokenUser}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  Token needs <code className="rounded bg-zinc-800 px-1">repo</code> scope
                </p>
              </div>
              
              {/* Repository Selection */}
              {repos.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Repository
                  </label>
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select repository...</option>
                    {repos.map(repo => (
                      <option key={repo.full_name} value={repo.full_name}>
                        {repo.full_name} {repo.private ? '(private)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Branch */}
              {selectedRepo && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Branch</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Data Path</label>
                    <input
                      type="text"
                      value={dataPath}
                      onChange={(e) => setDataPath(e.target.value)}
                      placeholder="data"
                      className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
              
              {/* Info */}
              <div className="rounded-lg bg-zinc-800/50 p-3 text-xs text-zinc-400">
                <p className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Data will be stored in <code className="text-zinc-300">{dataPath}/</code> folder
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                onClick={() => setShowConnectModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!token || !selectedRepo}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Connect Repository
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
