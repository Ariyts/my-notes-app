/**
 * Repository Sync Component
 * 
 * Advanced GitHub repository synchronization with:
 * - Detailed change preview (real diff with item-level details)
 * - AES-256 encryption support
 * - Repository selection via token
 * - Pull/Push functionality
 */

import { useState, useEffect, useCallback } from 'react';
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
  Lock,
  LockOpen,
  ChevronDown,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { 
  EncryptedData, 
  encrypt, 
  decrypt, 
  isEncryptionSetUp,
  getSessionPassword,
  isSessionActive,
} from '../../lib/crypto';
import { Workspace, Section, SectionItem } from '../../types/sections';

// Types
interface RepoSyncConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  dataPath: string;
  lastSyncSha?: string;
  lastSyncAt?: string;
  encryptionEnabled?: boolean;
}

// Detailed change types
interface ItemChange {
  type: 'added' | 'modified' | 'deleted';
  itemName: string;
  itemId: string;
  field?: string;
}

interface FileChange {
  path: string;
  workspaceName?: string;
  status: 'added' | 'modified' | 'deleted' | 'unchanged';
  additions: number;
  deletions: number;
  sizeBytes: number;
  itemChanges: ItemChange[];
  selected: boolean;
  localSize?: number;
  remoteSize?: number;
  expanded?: boolean;
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

// Storage keys
const REPO_SYNC_CONFIG_KEY = 'pentest-hub-repo-sync-config';
const SYNC_VERSION_KEY = 'pentest-hub-sync-version';

// File names (encrypted versions)
const WORKSPACES_FILE = 'workspaces.enc.json';
const SECTIONS_FILE = 'sections.enc.json';
const METADATA_FILE = 'metadata.json';

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

// Compute detailed diff between local and remote items
function computeDiff(
  localItems: SectionItem[] | null,
  remoteItems: SectionItem[] | null
): { additions: number; deletions: number; itemChanges: ItemChange[] } {
  const localMap = new Map<string, SectionItem>();
  const remoteMap = new Map<string, SectionItem>();
  
  if (localItems) {
    localItems.forEach(item => localMap.set(item.id, item));
  }
  if (remoteItems) {
    remoteItems.forEach(item => remoteMap.set(item.id, item));
  }
  
  const itemChanges: ItemChange[] = [];
  let additions = 0;
  let deletions = 0;
  
  // Find added and modified items
  for (const [id, localItem] of localMap) {
    const remoteItem = remoteMap.get(id);
    const itemName = (localItem.data?.name as string) || 
                     (localItem.data?.title as string) || 
                     `Item ${id.slice(0, 8)}`;
    
    if (!remoteItem) {
      // New item
      itemChanges.push({
        type: 'added',
        itemName,
        itemId: id,
      });
      const localLines = JSON.stringify(localItem, null, 2).split('\n').length;
      additions += localLines;
    } else {
      // Check for modifications
      const localJson = JSON.stringify(localItem);
      const remoteJson = JSON.stringify(remoteItem);
      
      if (localJson !== remoteJson) {
        itemChanges.push({
          type: 'modified',
          itemName,
          itemId: id,
        });
        
        const localLines = JSON.stringify(localItem, null, 2).split('\n').length;
        const remoteLines = JSON.stringify(remoteItem, null, 2).split('\n').length;
        
        if (localLines > remoteLines) {
          additions += localLines - remoteLines;
        } else {
          deletions += remoteLines - localLines;
        }
      }
    }
  }
  
  // Find deleted items
  for (const [id, remoteItem] of remoteMap) {
    if (!localMap.has(id)) {
      const itemName = (remoteItem.data?.name as string) || 
                       (remoteItem.data?.title as string) || 
                       `Item ${id.slice(0, 8)}`;
      
      itemChanges.push({
        type: 'deleted',
        itemName,
        itemId: id,
      });
      
      const remoteLines = JSON.stringify(remoteItem, null, 2).split('\n').length;
      deletions += remoteLines;
    }
  }
  
  return { additions, deletions, itemChanges };
}

// Props
interface RepositorySyncProps {
  onDataChange?: () => void;
  onSyncComplete?: () => void;
}

// Detect repository from URL
function detectRepoFromUrl(): { owner: string; repo: string } | null {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Format: username.github.io/repo-name/
  if (hostname.endsWith('.github.io')) {
    const owner = hostname.replace('.github.io', '');
    // For user.github.io sites, repo name is in pathname or it's owner.github.io
    const pathParts = pathname.split('/').filter(Boolean);
    const repo = pathParts[0] || `${owner}.github.io`;
    return { owner, repo };
  }
  
  // Custom domain - try to get from meta tag or return null
  const repoMeta = document.querySelector('meta[name="github-repo"]');
  if (repoMeta) {
    const content = repoMeta.getAttribute('content') || '';
    const parts = content.split('/');
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }
  
  return null;
}

export function RepositorySync({ onDataChange, onSyncComplete }: RepositorySyncProps) {
  // State
  const [config, setConfig] = useState<RepoSyncConfig | null>(loadConfig);
  const [showConnectModal, setShowConnectModal] = useState(!config?.token);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [showChanges, setShowChanges] = useState(false);
  
  // Token validation state
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<{
    owner: string;
    repo: string;
    branch: string;
  } | null>(null);
  
  // Encryption state
  const encryptionAvailable = isEncryptionSetUp() && isSessionActive();
  
  // Load config on mount
  useEffect(() => {
    const saved = loadConfig();
    if (saved) {
      setConfig(saved);
      setShowConnectModal(!saved.token);
    }
  }, []);
  
  // Connect with auto-detection
  const handleConnect = async () => {
    if (!token.trim()) {
      setSyncMessage({ type: 'error', text: 'Please enter a GitHub token' });
      return;
    }
    
    setIsConnecting(true);
    setSyncMessage(null);
    
    try {
      // 1. Validate token
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      
      if (userRes.status === 401) {
        setSyncMessage({ type: 'error', text: 'Invalid token. Please check and try again.' });
        setIsConnecting(false);
        return;
      }
      
      if (!userRes.ok) {
        setSyncMessage({ type: 'error', text: `GitHub API error: ${userRes.status}` });
        setIsConnecting(false);
        return;
      }
      
      const user = await userRes.json();
      
      // 2. Detect repository from URL
      const detected = detectRepoFromUrl();
      
      if (!detected) {
        setSyncMessage({ type: 'error', text: 'Could not detect repository from URL. Make sure you are on GitHub Pages.' });
        setIsConnecting(false);
        return;
      }
      
      // 3. Check access to repository and get default branch
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
        setSyncMessage({ type: 'error', text: `Repository '${detected.owner}/${detected.repo}' not found or no access. Make sure the token has access to this repository.` });
        setIsConnecting(false);
        return;
      }
      
      if (repoRes.status === 403) {
        setSyncMessage({ type: 'error', text: 'Access denied. Token needs "repo" scope.' });
        setIsConnecting(false);
        return;
      }
      
      if (!repoRes.ok) {
        setSyncMessage({ type: 'error', text: `Failed to access repository: ${repoRes.status}` });
        setIsConnecting(false);
        return;
      }
      
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch;
      
      // 4. Save config
      const newConfig: RepoSyncConfig = {
        token,
        owner: detected.owner,
        repo: detected.repo,
        branch: defaultBranch,
        dataPath: 'data', // Fixed path
        encryptionEnabled: true, // Always encrypted
      };
      
      saveConfig(newConfig);
      setConfig(newConfig);
      setShowConnectModal(false);
      setDetectedInfo({ owner: detected.owner, repo: detected.repo, branch: defaultBranch });
      setSyncMessage({ type: 'success', text: `Connected! Using branch: ${defaultBranch}` });
      
    } catch (err) {
      console.error('Connection error:', err);
      setSyncMessage({ type: 'error', text: 'Connection failed. Please check your network.' });
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect
  const handleDisconnect = () => {
    localStorage.removeItem(REPO_SYNC_CONFIG_KEY);
    setConfig(null);
    setToken('');
    setDetectedInfo(null);
    setShowConnectModal(true);
  };
  
  // Get all local data organized by workspaces
  const getLocalData = useCallback(() => {
    const workspaces: Workspace[] = JSON.parse(localStorage.getItem('pentest-hub-workspaces') || '[]');
    const sections: Section[] = JSON.parse(localStorage.getItem('pentest-hub-sections') || '[]');
    
    const data: Record<string, { workspace: Workspace; sections: { section: Section; items: SectionItem[] }[] }> = {};
    
    for (const workspace of workspaces) {
      data[workspace.id] = {
        workspace,
        sections: [],
      };
      
      const workspaceSections = sections.filter(s => s.workspaceId === workspace.id);
      for (const section of workspaceSections) {
        const items: SectionItem[] = JSON.parse(
          localStorage.getItem(`section-data-${section.id}`) || '[]'
        );
        data[workspace.id].sections.push({ section, items });
      }
    }
    
    return { workspaces, sections, data };
  }, []);
  
  // Fetch remote file content
  const fetchRemoteFile = async (path: string): Promise<{ content: string; sha: string } | null> => {
    if (!config) return null;
    
    try {
      const res = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`,
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
        return { content, sha: data.sha };
      }
    } catch (err) {
      console.error('Failed to fetch remote file:', path, err);
    }
    
    return null;
  };
  
  // Detect changes with detailed diff
  const detectChanges = async () => {
    if (!config) return;
    
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Detecting changes...' });
    
    try {
      const { workspaces, sections, data: localData } = getLocalData();
      const changes: FileChange[] = [];
      
      // Process each workspace
      for (const workspace of workspaces) {
        const workspaceData = localData[workspace.id];
        if (!workspaceData) continue;
        
        // Process each section
        for (const { section, items } of workspaceData.sections) {
          const path = `${config.dataPath}/${workspace.id}/${section.id}.json`;
          const localJson = JSON.stringify(items, null, 2);
          const localSize = new Blob([localJson]).size;
          
          // Try to get remote file
          const remote = await fetchRemoteFile(path);
          
          if (remote) {
            // Parse remote content (may be encrypted)
            let remoteItems: SectionItem[] | null;
            
            try {
              const remoteData = JSON.parse(remote.content);
              
              // Check if encrypted
              if (remoteData.algorithm === 'AES-256-GCM' && encryptionAvailable) {
                const password = getSessionPassword();
                if (password) {
                  remoteItems = await decrypt<SectionItem[]>(remoteData as EncryptedData, password);
                } else {
                  remoteItems = null;
                }
              } else {
                remoteItems = remoteData;
              }
            } catch {
              remoteItems = null;
            }
            
            const localItems = items;
            
            // Compute diff
            const diff = computeDiff(localItems, remoteItems);
            
            if (diff.itemChanges.length > 0) {
              changes.push({
                path,
                workspaceName: workspace.name,
                status: 'modified',
                additions: diff.additions,
                deletions: diff.deletions,
                sizeBytes: localSize,
                itemChanges: diff.itemChanges,
                selected: true,
                localSize,
                remoteSize: new Blob([remote.content]).size,
                expanded: false,
              });
            } else {
              // No changes
              changes.push({
                path,
                workspaceName: workspace.name,
                status: 'unchanged',
                additions: 0,
                deletions: 0,
                sizeBytes: localSize,
                itemChanges: [],
                selected: false,
                localSize,
                remoteSize: new Blob([remote.content]).size,
              });
            }
          } else {
            // New file
            const itemChanges: ItemChange[] = items.map(item => ({
              type: 'added' as const,
              itemName: (item.data?.name as string) || (item.data?.title as string) || `Item ${item.id.slice(0, 8)}`,
              itemId: item.id,
            }));
            
            changes.push({
              path,
              workspaceName: workspace.name,
              status: 'added',
              additions: localJson.split('\n').length,
              deletions: 0,
              sizeBytes: localSize,
              itemChanges,
              selected: true,
              localSize,
              expanded: false,
            });
          }
        }
      }
      
      // Also check workspaces.enc.json and sections.enc.json (encrypted metadata)
      const workspacesPath = `${config.dataPath}/${WORKSPACES_FILE}`;
      const sectionsPath = `${config.dataPath}/${SECTIONS_FILE}`;
      
      const localWorkspaces = JSON.stringify(workspaces, null, 2);
      const localSections = JSON.stringify(sections, null, 2);
      
      const remoteWorkspaces = await fetchRemoteFile(workspacesPath);
      const remoteSections = await fetchRemoteFile(sectionsPath);
      
      // Add workspaces.enc.json change (always include if encryption available)
      // Note: We compare encrypted content, not plaintext
      if (encryptionAvailable) {
        changes.unshift({
          path: workspacesPath,
          workspaceName: 'System',
          status: remoteWorkspaces ? 'modified' : 'added',
          additions: 1, // Encrypted content, approximate
          deletions: remoteWorkspaces ? 1 : 0,
          sizeBytes: new Blob([localWorkspaces]).size,
          itemChanges: [],
          selected: true,
          localSize: new Blob([localWorkspaces]).size,
          remoteSize: remoteWorkspaces ? new Blob([remoteWorkspaces.content]).size : 0,
        });
      }
      
      // Add sections.enc.json change
      if (encryptionAvailable) {
        changes.unshift({
          path: sectionsPath,
          workspaceName: 'System',
          status: remoteSections ? 'modified' : 'added',
          additions: 1,
          deletions: remoteSections ? 1 : 0,
          sizeBytes: new Blob([localSections]).size,
          itemChanges: [],
          selected: true,
          localSize: new Blob([localSections]).size,
          remoteSize: remoteSections ? new Blob([remoteSections.content]).size : 0,
        });
      }
      
      setChanges(changes);
      
      const changedCount = changes.filter(c => c.status !== 'unchanged').length;
      if (changedCount > 0) {
        setSyncMessage({ type: 'info', text: `${changedCount} file(s) changed` });
        setShowChanges(true);
        setCommitMessage(`Sync data - ${new Date().toLocaleDateString()}`);
      } else {
        setSyncMessage({ type: 'success', text: 'No changes detected' });
      }
    } catch (err) {
      console.error('Failed to detect changes:', err);
      setSyncMessage({ type: 'error', text: 'Failed to detect changes' });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Toggle file selection
  const toggleFileSelection = (path: string) => {
    setChanges(prev => prev.map(c => 
      c.path === path ? { ...c, selected: !c.selected } : c
    ));
  };
  
  // Toggle file expansion
  const toggleFileExpansion = (path: string) => {
    setChanges(prev => prev.map(c => 
      c.path === path ? { ...c, expanded: !c.expanded } : c
    ));
  };
  
  // Create initial commit for empty repository
  const createInitialCommit = async (cfg: RepoSyncConfig): Promise<{ commitSha: string; treeSha: string }> => {
    // Create an empty tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ tree: [] }),
      }
    );
    
    if (!treeRes.ok) {
      const errorText = await treeRes.text();
      throw new Error(`Failed to create tree: ${treeRes.status} ${errorText}`);
    }
    
    const treeData = await treeRes.json();
    const treeSha = treeData.sha;
    
    // Create initial commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: 'Initial commit - Pentest Hub data sync',
          tree: treeSha,
          parents: [],
        }),
      }
    );
    
    if (!commitRes.ok) {
      const errorText = await commitRes.text();
      throw new Error(`Failed to create commit: ${commitRes.status} ${errorText}`);
    }
    
    const commitData = await commitRes.json();
    const commitSha = commitData.sha;
    
    // Create the branch reference
    const refRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/refs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: `refs/heads/${cfg.branch}`,
          sha: commitSha,
        }),
      }
    );
    
    if (!refRes.ok) {
      const errorText = await refRes.text();
      throw new Error(`Failed to create branch '${cfg.branch}': ${refRes.status} ${errorText}`);
    }
    
    return { commitSha, treeSha };
  };
  
  // Push changes
  const handlePush = async () => {
    if (!config) return;
    
    // Require encryption for sync
    if (!isEncryptionSetUp()) {
      setSyncMessage({ type: 'error', text: 'Encryption must be enabled before syncing. Go to Settings → Security.' });
      return;
    }
    
    if (!isSessionActive()) {
      setSyncMessage({ type: 'error', text: 'Please unlock your vault first.' });
      return;
    }
    
    const selectedChanges = changes.filter(c => c.selected && c.status !== 'unchanged');
    if (selectedChanges.length === 0) {
      setSyncMessage({ type: 'info', text: 'No files selected' });
      return;
    }
    
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Pushing encrypted data...' });
    
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
      
      let baseTreeSha: string;
      let baseTree: string;
      
      if (!branchRes.ok) {
        const errorBody = await branchRes.text();
        console.error('Branch fetch error:', branchRes.status, errorBody);
        
        if (branchRes.status === 404) {
          // Branch doesn't exist - check if repo is empty
          const repoRes = await fetch(
            `https://api.github.com/repos/${config.owner}/${config.repo}`,
            {
              headers: {
                Authorization: `Bearer ${config.token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
            }
          );
          
          if (!repoRes.ok) {
            throw new Error(`Repository '${config.owner}/${config.repo}' not found. Check owner and repo name.`);
          }
          
          const repoData = await repoRes.json();
          
          if (repoData.size === 0) {
            // Empty repository - create initial commit
            setSyncMessage({ type: 'info', text: 'Creating initial commit in empty repository...' });
            
            const initData = await createInitialCommit(config);
            baseTreeSha = initData.commitSha;
            baseTree = initData.treeSha;
          } else {
            // Repo exists but branch doesn't - list available branches
            const branchesRes = await fetch(
              `https://api.github.com/repos/${config.owner}/${config.repo}/branches`,
              {
                headers: {
                  Authorization: `Bearer ${config.token}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              }
            );
            
            if (branchesRes.ok) {
              const branches = await branchesRes.json();
              const branchNames = branches.map((b: { name: string }) => b.name).join(', ');
              throw new Error(`Branch '${config.branch}' not found. Available branches: ${branchNames}`);
            } else {
              throw new Error(`Branch '${config.branch}' doesn't exist. Try 'main' or 'master'.`);
            }
          }
        } else if (branchRes.status === 403) {
          throw new Error('Access denied. Check if token has "repo" scope.');
        } else if (branchRes.status === 401) {
          throw new Error('Invalid token. Please re-enter your GitHub PAT.');
        } else {
          throw new Error(`GitHub API error (${branchRes.status}): ${errorBody}`);
        }
      } else {
        // Branch exists - proceed normally
        const branchData = await branchRes.json();
        baseTreeSha = branchData.object.sha;
        
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
        
        if (!commitRes.ok) {
          throw new Error('Failed to get commit data');
        }
        
        const commitData = await commitRes.json();
        baseTree = commitData.tree.sha;
      }
      
      // Create blobs for each file
      const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
      const password = getSessionPassword();
      
      if (!password) {
        throw new Error('Session password not available');
      }
      
      // Get current sync version
      let currentVersion = parseInt(localStorage.getItem(SYNC_VERSION_KEY) || '0', 10);
      
      for (const change of selectedChanges) {
        let content: string;
        
        // Determine what content to push
        if (change.path.endsWith(WORKSPACES_FILE)) {
          // Encrypt workspaces.enc.json - ALWAYS encrypted
          const rawContent = localStorage.getItem('pentest-hub-workspaces') || '[]';
          const encrypted = await encrypt(JSON.parse(rawContent), password);
          content = JSON.stringify(encrypted, null, 2);
        } else if (change.path.endsWith(SECTIONS_FILE)) {
          // Encrypt sections.enc.json - ALWAYS encrypted
          const rawContent = localStorage.getItem('pentest-hub-sections') || '[]';
          const encrypted = await encrypt(JSON.parse(rawContent), password);
          content = JSON.stringify(encrypted, null, 2);
        } else {
          // Section data file - extract workspace and section id from path
          const match = change.path.match(/\/([^/]+)\/([^/]+)\.json$/);
          if (match) {
            const sectionId = match[2];
            const rawContent = localStorage.getItem(`section-data-${sectionId}`) || '[]';
            
            // Encrypt section data (always encrypted for sync)
            const encrypted = await encrypt(JSON.parse(rawContent), password);
            content = JSON.stringify(encrypted, null, 2);
          } else {
            continue;
          }
        }
        
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
          path: change.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
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
        // Update local version
        currentVersion++;
        localStorage.setItem(SYNC_VERSION_KEY, String(currentVersion));
        
        setSyncMessage({ type: 'success', text: `Pushed ${selectedChanges.length} encrypted file(s)!` });
        setChanges([]);
        setShowChanges(false);
        
        // Update config
        const updatedConfig = { 
          ...config, 
          lastSyncSha: newCommitData.sha, 
          lastSyncAt: new Date().toISOString(),
          encryptionEnabled: true,
        };
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
    
    // Require encryption for sync
    if (!isEncryptionSetUp()) {
      setSyncMessage({ type: 'error', text: 'Encryption must be enabled before syncing.' });
      return;
    }
    
    if (!isSessionActive()) {
      setSyncMessage({ type: 'error', text: 'Please unlock your vault first.' });
      return;
    }
    
    if (!confirm('This will replace local data with data from repository. Continue?')) return;
    
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Pulling and decrypting data...' });
    
    const password = getSessionPassword();
    if (!password) {
      setSyncMessage({ type: 'error', text: 'Session password not available.' });
      setIsSyncing(false);
      return;
    }
    
    try {
      // Pull workspaces.enc.json (encrypted)
      const workspacesRemote = await fetchRemoteFile(`${config.dataPath}/${WORKSPACES_FILE}`);
      if (workspacesRemote) {
        try {
          const encryptedData = JSON.parse(workspacesRemote.content);
          if (encryptedData.algorithm === 'AES-256-GCM') {
            const decrypted = await decrypt(encryptedData, password);
            localStorage.setItem('pentest-hub-workspaces', JSON.stringify(decrypted));
          } else {
            // Legacy unencrypted format
            localStorage.setItem('pentest-hub-workspaces', workspacesRemote.content);
          }
        } catch {
          // Try as plain JSON (legacy)
          localStorage.setItem('pentest-hub-workspaces', workspacesRemote.content);
        }
      }
      
      // Pull sections.enc.json (encrypted)
      const sectionsRemote = await fetchRemoteFile(`${config.dataPath}/${SECTIONS_FILE}`);
      if (sectionsRemote) {
        try {
          const encryptedData = JSON.parse(sectionsRemote.content);
          if (encryptedData.algorithm === 'AES-256-GCM') {
            const decrypted = await decrypt(encryptedData, password);
            localStorage.setItem('pentest-hub-sections', JSON.stringify(decrypted));
          } else {
            // Legacy unencrypted format
            localStorage.setItem('pentest-hub-sections', sectionsRemote.content);
          }
        } catch {
          // Try as plain JSON (legacy)
          localStorage.setItem('pentest-hub-sections', sectionsRemote.content);
        }
      }
      
      // Pull metadata.json
      const metadataRemote = await fetchRemoteFile(`${config.dataPath}/${METADATA_FILE}`);
      if (metadataRemote) {
        try {
          const metadata = JSON.parse(metadataRemote.content);
          if (metadata.version) {
            localStorage.setItem(SYNC_VERSION_KEY, String(metadata.version));
          }
        } catch {
          // Ignore metadata errors
        }
      }
      
      // Get all sections and pull their data
      const sections: Section[] = JSON.parse(localStorage.getItem('pentest-hub-sections') || '[]');
      const workspaces: Workspace[] = JSON.parse(localStorage.getItem('pentest-hub-workspaces') || '[]');
      
      let pulledCount = 2;
      
      for (const section of sections) {
        const path = `${config.dataPath}/${section.workspaceId}/${section.id}.json`;
        const remote = await fetchRemoteFile(path);
        
        if (remote) {
          let content = remote.content;
          
          // Try to decrypt if encrypted
          try {
            const data = JSON.parse(content);
            if (data.algorithm === 'AES-256-GCM') {
              const decrypted = await decrypt(data, password);
              content = JSON.stringify(decrypted);
            }
          } catch {
            // Not encrypted or invalid JSON, use as-is
          }
          
          localStorage.setItem(`section-data-${section.id}`, content);
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
  const getStatusIcon = (status: FileChange['status']) => {
    switch (status) {
      case 'added': return <Plus className="h-3 w-3 text-emerald-400" />;
      case 'modified': return <Edit3 className="h-3 w-3 text-amber-400" />;
      case 'deleted': return <Minus className="h-3 w-3 text-red-400" />;
      default: return <Check className="h-3 w-3 text-zinc-500" />;
    }
  };
  
  // Get item change icon
  const getItemChangeIcon = (type: ItemChange['type']) => {
    switch (type) {
      case 'added': return <Plus className="h-3 w-3 text-emerald-400" />;
      case 'modified': return <Edit3 className="h-3 w-3 text-amber-400" />;
      case 'deleted': return <Minus className="h-3 w-3 text-red-400" />;
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
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Lock className="h-3 w-3" />
              Encrypted
            </span>
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
          
          <div className="border-t border-zinc-700 max-h-[400px] overflow-y-auto">
            {/* Group by workspace */}
            {Array.from(new Set(changes.map(c => c.workspaceName))).map(workspaceName => (
              <div key={workspaceName}>
                {/* Workspace header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 text-xs text-zinc-400 font-medium">
                  <Folder className="h-3 w-3" />
                  {workspaceName}
                </div>
                
                {/* Files in workspace */}
                {changes
                  .filter(c => c.workspaceName === workspaceName)
                  .map(change => (
                    <div key={change.path}>
                      {/* File row */}
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 cursor-pointer",
                          change.status === 'unchanged' && "opacity-50"
                        )}
                        onClick={() => change.itemChanges.length > 0 && toggleFileExpansion(change.path)}
                      >
                        <input
                          type="checkbox"
                          checked={change.selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleFileSelection(change.path);
                          }}
                          disabled={change.status === 'unchanged'}
                          className="rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {getStatusIcon(change.status)}
                        <FileText className="h-4 w-4 text-zinc-500" />
                        <span className="flex-1 text-sm text-zinc-300">
                          {change.path.split('/').pop()}
                        </span>
                        {change.status !== 'unchanged' && (
                          <span className="text-xs text-zinc-500 font-mono">
                            +{change.additions} -{change.deletions}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          {formatSize(change.localSize || 0)}
                        </span>
                        {change.itemChanges.length > 0 && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span className="text-xs">({change.itemChanges.length} items)</span>
                            {change.expanded ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </div>
                        )}
                      </div>
                      
                      {/* Item changes (expanded view) */}
                      {change.expanded && change.itemChanges.length > 0 && (
                        <div className="pl-12 pr-4 py-1 bg-zinc-900/30 space-y-1">
                          {change.itemChanges.slice(0, 20).map((itemChange, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              {getItemChangeIcon(itemChange.type)}
                              <span className={cn(
                                itemChange.type === 'added' ? 'text-emerald-300' :
                                itemChange.type === 'modified' ? 'text-amber-300' :
                                'text-red-300'
                              )}>
                                {itemChange.itemName}
                              </span>
                              {itemChange.field && (
                                <span className="text-zinc-500">({itemChange.field})</span>
                              )}
                            </div>
                          ))}
                          {change.itemChanges.length > 20 && (
                            <div className="text-xs text-zinc-500 pl-5">
                              ... and {change.itemChanges.length - 20} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
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
              <h2 className="text-lg font-bold text-zinc-100">🔄 Repository Sync</h2>
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
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setSyncMessage(null); }}
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
                <p className="mt-2 text-xs text-zinc-500">
                  Token needs <code className="rounded bg-zinc-800 px-1">repo</code> scope. 
                  <a 
                    href="https://github.com/settings/tokens/new?scopes=repo" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 ml-1"
                  >
                    Create token →
                  </a>
                </p>
              </div>
              
              {/* Error message in modal */}
              {syncMessage && syncMessage.type === 'error' && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {syncMessage.text}
                </div>
              )}
              
              {/* Info */}
              <div className="rounded-lg bg-zinc-800/50 p-3 text-xs text-zinc-400 space-y-1">
                <p className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Repository and branch will be detected automatically
                </p>
                <p className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  All data is encrypted with AES-256 before sync
                </p>
              </div>
              
              {/* Prerequisites */}
              {!isEncryptionSetUp() && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-sm text-amber-400">
                    ⚠️ Encryption must be enabled first. Go to Settings → Security.
                  </p>
                </div>
              )}
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
                disabled={!token.trim() || isConnecting || !isEncryptionSetUp()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
