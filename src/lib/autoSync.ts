/**
 * Auto Sync Module
 * 
 * Automatically loads encrypted data from GitHub Pages on app startup.
 * Compares versions and applies newer data.
 */

import { decrypt, getSessionPassword, isSessionActive, EncryptedData } from './crypto';

// Storage keys
const WORKSPACES_KEY = 'pentest-hub-workspaces';
const SECTIONS_KEY = 'pentest-hub-sections';
const SYNC_VERSION_KEY = 'pentest-hub-sync-version';

// File paths (relative to app root)
const DATA_PATH = './data';
const WORKSPACES_FILE = 'workspaces.enc.json';
const SECTIONS_FILE = 'sections.enc.json';
const METADATA_FILE = 'metadata.json';

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
}

/**
 * Get local sync version
 */
function getLocalVersion(): number {
  return parseInt(localStorage.getItem(SYNC_VERSION_KEY) || '0', 10);
}

/**
 * Set local sync version
 */
function setLocalVersion(version: number): void {
  localStorage.setItem(SYNC_VERSION_KEY, String(version));
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
 * Auto-sync data from GitHub Pages
 * Called after successful unlock
 */
export async function autoSyncFromServer(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    workspacesLoaded: false,
    sectionsLoaded: false,
    itemsLoaded: 0,
  };
  
  // Check if session is active
  if (!isSessionActive()) {
    result.error = 'Session not active';
    return result;
  }
  
  const password = getSessionPassword();
  if (!password) {
    result.error = 'No session password';
    return result;
  }
  
  try {
    // 1. Fetch metadata
    const metadata = await fetchJson<Metadata>(`${DATA_PATH}/${METADATA_FILE}`);
    const remoteVersion = metadata?.version || 0;
    const localVersion = getLocalVersion();
    
    console.log(`[AutoSync] Local version: ${localVersion}, Remote version: ${remoteVersion}`);
    
    // 2. Fetch encrypted workspaces
    const workspacesEncrypted = await fetchJson<EncryptedData>(`${DATA_PATH}/${WORKSPACES_FILE}`);
    
    if (workspacesEncrypted) {
      try {
        // Check if encrypted
        if (workspacesEncrypted.algorithm === 'AES-256-GCM') {
          const decrypted = await decrypt(workspacesEncrypted, password);
          localStorage.setItem(WORKSPACES_KEY, JSON.stringify(decrypted));
          result.workspacesLoaded = true;
          console.log('[AutoSync] Loaded workspaces from server');
        } else {
          // Not encrypted (legacy), use as-is
          localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspacesEncrypted));
          result.workspacesLoaded = true;
          console.log('[AutoSync] Loaded workspaces (unencrypted)');
        }
      } catch (decryptError) {
        console.error('[AutoSync] Failed to decrypt workspaces:', decryptError);
      }
    }
    
    // 3. Fetch encrypted sections
    const sectionsEncrypted = await fetchJson<EncryptedData>(`${DATA_PATH}/${SECTIONS_FILE}`);
    
    if (sectionsEncrypted) {
      try {
        if (sectionsEncrypted.algorithm === 'AES-256-GCM') {
          const decrypted = await decrypt(sectionsEncrypted, password);
          localStorage.setItem(SECTIONS_KEY, JSON.stringify(decrypted));
          result.sectionsLoaded = true;
          console.log('[AutoSync] Loaded sections from server');
        } else {
          localStorage.setItem(SECTIONS_KEY, JSON.stringify(sectionsEncrypted));
          result.sectionsLoaded = true;
          console.log('[AutoSync] Loaded sections (unencrypted)');
        }
      } catch (decryptError) {
        console.error('[AutoSync] Failed to decrypt sections:', decryptError);
      }
    }
    
    // 4. Fetch section items
    if (result.sectionsLoaded) {
      const sections = JSON.parse(localStorage.getItem(SECTIONS_KEY) || '[]');
      
      for (const section of sections) {
        const itemPath = `${DATA_PATH}/${section.workspaceId}/${section.id}.json`;
        const itemEncrypted = await fetchJson(itemPath);
        
        if (itemEncrypted) {
          try {
            if ((itemEncrypted as EncryptedData).algorithm === 'AES-256-GCM') {
              const decrypted = await decrypt(itemEncrypted as EncryptedData, password);
              localStorage.setItem(`section-data-${section.id}`, JSON.stringify(decrypted));
              result.itemsLoaded++;
            } else {
              localStorage.setItem(`section-data-${section.id}`, JSON.stringify(itemEncrypted));
              result.itemsLoaded++;
            }
          } catch (decryptError) {
            console.error(`[AutoSync] Failed to decrypt section ${section.id}:`, decryptError);
          }
        }
      }
      
      console.log(`[AutoSync] Loaded ${result.itemsLoaded} section items`);
    }
    
    // 5. Update local version
    if (remoteVersion > 0) {
      setLocalVersion(remoteVersion);
    }
    
    result.success = result.workspacesLoaded || result.sectionsLoaded || result.itemsLoaded > 0;
    
    // 6. Dispatch event to notify WorkspaceContext to reload
    if (result.success) {
      console.log('[AutoSync] Dispatching workspace-reload event');
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
  const metadata = await fetchJson<Metadata>(`${DATA_PATH}/${METADATA_FILE}`);
  
  if (metadata) {
    return {
      exists: true,
      version: metadata.version,
      lastModified: metadata.lastModified,
    };
  }
  
  // Check if at least workspaces file exists
  const workspaces = await fetchJson(`${DATA_PATH}/${WORKSPACES_FILE}`);
  
  return {
    exists: workspaces !== null,
    version: 0,
  };
}
