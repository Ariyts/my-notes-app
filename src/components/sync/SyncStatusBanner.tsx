/**
 * Sync Status Banner
 * 
 * Shows a notification when:
 * - Remote has newer version (Pull available)
 * - Local has unpushed changes
 * 
 * Appears in bottom-right corner, non-blocking
 */

import { useState, useEffect, useCallback } from 'react';
import { CloudDownload, CloudUpload, X, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SyncStatus {
  status: 'checking' | 'remote_newer' | 'local_newer' | 'synced' | 'error' | 'offline' | 'no_config';
  remoteVersion?: number;
  localVersion?: number;
  lastRemoteModified?: string;
}

interface SyncStatusBannerProps {
  onPull?: () => void;
  onPush?: () => void;
}

const SYNC_VERSION_KEY = 'pentest-hub-sync-version';
const REPO_SYNC_CONFIG_KEY = 'pentest-hub-repo-sync-config';

export function SyncStatusBanner({ onPull, onPush }: SyncStatusBannerProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'checking' });
  const [dismissed, setDismissed] = useState(false);
  
  // Check for updates
  const checkForUpdates = useCallback(async () => {
    try {
      // Check if sync is configured
      const configStr = localStorage.getItem(REPO_SYNC_CONFIG_KEY);
      if (!configStr) {
        setSyncStatus({ status: 'no_config' });
        return;
      }
      
      const config = JSON.parse(configStr);
      if (!config.token || !config.owner || !config.repo) {
        setSyncStatus({ status: 'no_config' });
        return;
      }
      
      // Get local version
      const localVersion = parseInt(localStorage.getItem(SYNC_VERSION_KEY) || '0', 10);
      
      // Try to fetch metadata.json from GitHub Pages
      // This works if the repo is the same as where the app is hosted
      const metadataUrl = `./data/metadata.json`;
      
      try {
        const response = await fetch(metadataUrl, {
          cache: 'no-store', // Always fetch fresh
        });
        
        if (!response.ok) {
          // No remote metadata yet - local is ahead or first sync
          if (localVersion > 0) {
            setSyncStatus({ status: 'local_newer', localVersion });
          } else {
            setSyncStatus({ status: 'synced' });
          }
          return;
        }
        
        const metadata = await response.json();
        const remoteVersion = metadata.version || 0;
        
        if (remoteVersion > localVersion) {
          setSyncStatus({
            status: 'remote_newer',
            remoteVersion,
            localVersion,
            lastRemoteModified: metadata.lastModified,
          });
        } else if (localVersion > remoteVersion) {
          setSyncStatus({
            status: 'local_newer',
            remoteVersion,
            localVersion,
          });
        } else {
          setSyncStatus({ status: 'synced', localVersion, remoteVersion });
        }
      } catch {
        // Network error or no metadata file
        if (localVersion > 0) {
          setSyncStatus({ status: 'local_newer', localVersion });
        } else {
          setSyncStatus({ status: 'offline' });
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setSyncStatus({ status: 'error' });
    }
  }, []);
  
  useEffect(() => {
    // Check on mount
    checkForUpdates();
    
    // Check every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkForUpdates]);
  
  // Dismiss banner
  const handleDismiss = () => {
    setDismissed(true);
  };
  
  // Don't show if dismissed or no action needed
  if (dismissed) return null;
  if (syncStatus.status === 'checking') return null;
  if (syncStatus.status === 'synced') return null;
  if (syncStatus.status === 'no_config') return null;
  if (syncStatus.status === 'error') return null;
  if (syncStatus.status === 'offline') return null;
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 max-w-sm rounded-lg shadow-lg flex items-start gap-3 p-4",
      "animate-in slide-in-from-bottom-4 fade-in duration-300",
      syncStatus.status === 'remote_newer' 
        ? "bg-blue-600 text-white" 
        : "bg-amber-600 text-white"
    )}>
      {syncStatus.status === 'remote_newer' ? (
        <>
          <CloudDownload className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Updates available</p>
            <p className="text-xs text-white/80 mt-1">
              Version {syncStatus.remoteVersion} is available
              {syncStatus.lastRemoteModified && (
                <span className="opacity-70">
                  {' '}• {new Date(syncStatus.lastRemoteModified).toLocaleDateString()}
                </span>
              )}
            </p>
            <button
              onClick={() => {
                onPull?.();
                setDismissed(true);
              }}
              className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              Pull now
            </button>
          </div>
        </>
      ) : (
        <>
          <CloudUpload className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Unpushed changes</p>
            <p className="text-xs text-white/80 mt-1">
              You have local changes not synced to repository
            </p>
            <button
              onClick={() => {
                onPush?.();
                setDismissed(true);
              }}
              className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              Push now
            </button>
          </div>
        </>
      )}
      
      <button
        onClick={handleDismiss}
        className="text-white/60 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Export utility functions for use in RepositorySync
export { SYNC_VERSION_KEY };
