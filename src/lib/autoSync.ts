/**
 * Auto Sync Module
 * 
 * Automatically loads encrypted data from GitHub Pages on app startup.
 * Uses PUBLIC_VAULT_PASSWORD for automatic decryption.
 * 
 * Security Model:
 * - Data is encrypted in GitHub (not readable in repo)
 * - Automatically decrypted on website load
 * - No user password required for viewing
 */

import { decrypt, EncryptedData } from './crypto';
import { PUBLIC_VAULT_PASSWORD, SYNC_KEYS, DATA_PATHS } from '../config/constants';

// Types
interface SyncResult {
  success: boolean;
  workspacesLoaded: boolean;
  sectionsLoaded: boolean;
  itemsLoaded: number;
  error?: string;
}

interface Metadata {
  version: number;
  lastModified: string;
  passwordFingerprint?: string;
}

/**
 * Get local sync version
 */
function getLocalVersion(): number {
  return parseInt(localStorage.getItem(SYNC_KEYS.SYNC_VERSION) || '0', 10);
}

/**
 * Set local sync version
 */
function setLocalVersion(version: number): void {
  localStorage.setItem(SYNC_KEYS.SYNC_VERSION, String(version));
}

/**
 * Fetch JSON from relative path
 */
async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, {
      cache: 'no-store', // Always fetch fresh
    });
    
    if (!response.ok) {
      console.log(`[AutoSync] ${path} not found (${response.status})`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.log(`[AutoSync] Failed to fetch ${path}:`, error);
    return null;
  }
}

/**
 * Decrypt data if encrypted, return as-is if not
 */
async function decryptIfNeeded<T>(data: unknown, password: string): Promise<T | null> {
  try {
    // Check if encrypted
    if (data && typeof data === 'object' && 'algorithm' in data) {
      const encrypted = data as EncryptedData;
      if (encrypted.algorithm === 'AES-256-GCM') {
        return await decrypt<T>(encrypted, password);
      }
    }
    // Not encrypted, return as-is
    return data as T;
  } catch (error) {
    console.error('[AutoSync] Decryption failed:', error);
    return null;
  }
}

/**
 * Auto-load data from GitHub Pages
 * Called on app startup - automatically decrypts with PUBLIC_VAULT_PASSWORD
 */
export async function autoLoadFromServer(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    workspacesLoaded: false,
    sectionsLoaded: false,
    itemsLoaded: 0,
  };

  try {
    console.log('[AutoSync] Starting auto-load from server...');
    
    // 1. Fetch metadata
    const metadata = await fetchJson<Metadata>(`${DATA_PATHS.BASE}/${DATA_PATHS.METADATA}`);
    const remoteVersion = metadata?.version || 0;
    const localVersion = getLocalVersion();
    
    console.log(`[AutoSync] Local version: ${localVersion}, Remote version: ${remoteVersion}`);
    
    // 2. Fetch encrypted workspaces
    const workspacesData = await fetchJson<unknown>(`${DATA_PATHS.BASE}/${DATA_PATHS.WORKSPACES}`);
    
    if (workspacesData) {
      const decrypted = await decryptIfNeeded<unknown[]>(workspacesData, PUBLIC_VAULT_PASSWORD);
      if (decrypted) {
        localStorage.setItem(SYNC_KEYS.WORKSPACES, JSON.stringify(decrypted));
        result.workspacesLoaded = true;
        console.log('[AutoSync] Loaded workspaces from server');
      }
    }
    
    // 3. Fetch encrypted sections
    const sectionsData = await fetchJson<unknown>(`${DATA_PATHS.BASE}/${DATA_PATHS.SECTIONS}`);
    
    if (sectionsData) {
      const decrypted = await decryptIfNeeded<{ workspaceId: string; id: string }[]>(sectionsData, PUBLIC_VAULT_PASSWORD);
      if (decrypted) {
        localStorage.setItem(SYNC_KEYS.SECTIONS, JSON.stringify(decrypted));
        result.sectionsLoaded = true;
        console.log('[AutoSync] Loaded sections from server');
        
        // 4. Fetch section items
        for (const section of decrypted) {
          const itemPath = `${DATA_PATHS.BASE}/${section.workspaceId}/${section.id}.json`;
          const itemData = await fetchJson<unknown>(itemPath);
          
          if (itemData) {
            const decryptedItems = await decryptIfNeeded<unknown[]>(itemData, PUBLIC_VAULT_PASSWORD);
            if (decryptedItems) {
              localStorage.setItem(`section-data-${section.id}`, JSON.stringify(decryptedItems));
              result.itemsLoaded++;
            }
          }
        }
        
        console.log(`[AutoSync] Loaded ${result.itemsLoaded} section items`);
      }
    }
    
    // 5. Update local version
    if (remoteVersion > 0) {
      setLocalVersion(remoteVersion);
    }
    
    result.success = result.workspacesLoaded || result.sectionsLoaded || result.itemsLoaded > 0;
    
    // 6. Dispatch event to notify WorkspaceContext to reload
    if (result.success) {
      console.log('[AutoSync] Auto-load successful, dispatching workspace-reload event');
      window.dispatchEvent(new CustomEvent('workspace-reload'));
    }

  } catch (error) {
    console.error('[AutoSync] Error:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return result;
}

/**
 * Check if remote data exists without loading
 */
export async function checkRemoteData(): Promise<{
  exists: boolean;
  version: number;
  lastModified?: string;
}> {
  const metadata = await fetchJson<Metadata>(`${DATA_PATHS.BASE}/${DATA_PATHS.METADATA}`);
  
  if (metadata) {
    return {
      exists: true,
      version: metadata.version,
      lastModified: metadata.lastModified,
    };
  }
  
  // Check if at least workspaces file exists
  const workspaces = await fetchJson(`${DATA_PATHS.BASE}/${DATA_PATHS.WORKSPACES}`);
  
  return {
    exists: workspaces !== null,
    version: 0,
  };
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use autoLoadFromServer instead
 */
export const autoSyncFromServer = autoLoadFromServer;
