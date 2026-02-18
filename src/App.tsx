import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Settings } from './pages/Settings';
import { ContentTypesManager } from './pages/ContentTypes';
import { SectionPage } from './pages/SectionPage';
import { DataProvider } from './lib/DataContext';
import { WorkspaceProvider } from './lib/WorkspaceContext';
import { useEffect, useState, useCallback } from 'react';
import { LockScreen } from './components/security/LockScreen';
import { SetupPassword } from './components/security/SetupPassword';
import { WelcomeScreen } from './components/security/WelcomeScreen';
import { 
  isEncryptionSetUp, 
  isSessionActive, 
  loadEncryptedVault,
  clearSession,
} from './lib/crypto';
import { useAutoLock } from './lib/useAutoLock';
import { autoSyncFromServer, checkRemoteData } from './lib/autoSync';

// Legacy route redirector - redirects old routes to new section routes
function LegacyRedirect() {
  const { typeId } = useParams<{ typeId: string }>();
  return <Navigate to={`/section/${typeId}`} replace />;
}

type AppStatus = 'loading' | 'welcome' | 'setup' | 'locked' | 'unlocked' | 'syncing';

// Auto-lock timeout (15 minutes)
const AUTO_LOCK_TIMEOUT_MS = 15 * 60 * 1000;

// Check if this is a fresh install (no local data)
function isFreshInstall(): boolean {
  const hasWorkspaces = localStorage.getItem('pentest-hub-workspaces');
  const hasSections = localStorage.getItem('pentest-hub-sections');
  const hasEncryption = isEncryptionSetUp();
  
  // Fresh install if no encryption AND no local data
  return !hasEncryption && !hasWorkspaces && !hasSections;
}

export function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [showSetup, setShowSetup] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(isEncryptionSetUp());
  const [autoLockWarning, setAutoLockWarning] = useState<number | null>(null);
  
  // Handle lock
  const handleLock = useCallback(() => {
    clearSession();
    setStatus('locked');
    setAutoLockWarning(null);
  }, []);
  
  // Auto-lock hook
  const { resetTimer } = useAutoLock({
    timeoutMs: AUTO_LOCK_TIMEOUT_MS,
    onLock: handleLock,
    enabled: status === 'unlocked' && encryptionEnabled,
    warningMs: 60 * 1000, // 1 minute warning
    onWarning: (remainingSeconds) => {
      setAutoLockWarning(remainingSeconds);
    },
  });
  
  // Sync data from server after unlock
  const syncFromServer = useCallback(async () => {
    try {
      console.log('[App] Starting auto-sync from server...');
      const result = await autoSyncFromServer();
      
      if (result.success) {
        console.log('[App] Auto-sync successful:', result);
      } else {
        console.log('[App] Auto-sync result:', result);
      }
    } catch (error) {
      console.error('[App] Auto-sync failed:', error);
    }
  }, []);
  
  useEffect(() => {
    // Register for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Store the event for later use
      (window as any).deferredPrompt = e;
    });
    
    // Check app status
    const checkStatus = async () => {
      const encryptionSetup = isEncryptionSetUp();
      const sessionActive = isSessionActive();
      const hasVault = loadEncryptedVault() !== null;
      
      setEncryptionEnabled(encryptionSetup);
      
      // Check if this is a fresh install
      if (isFreshInstall()) {
        // Check if there's data on the server
        try {
          const remote = await checkRemoteData();
          if (remote.exists) {
            // Data exists on server - show welcome screen with restore option
            console.log('[App] Remote data found, showing welcome screen');
            setStatus('welcome');
            return;
          }
        } catch (err) {
          console.log('[App] Could not check remote data:', err);
        }
        // No remote data - could still show welcome for new user setup
        // For now, allow direct access
        setStatus('unlocked');
        return;
      }
      
      if (encryptionSetup && hasVault) {
        // Encryption is set up
        if (sessionActive) {
          setStatus('unlocked');
          // Auto-sync from server on app start (if already unlocked)
          syncFromServer();
        } else {
          setStatus('locked');
        }
      } else {
        // Encryption not set up
        setStatus('unlocked'); // Allow app usage without encryption
      }
    };
    
    checkStatus();
    
    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pentest-hub-encryption-setup') {
        checkStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncFromServer]);
  
  const handleUnlock = () => {
    setStatus('unlocked');
    setAutoLockWarning(null);
    // Sync from server after unlock
    syncFromServer();
  };
  
  const handleSetupComplete = () => {
    setShowSetup(false);
    setEncryptionEnabled(true);
    setStatus('unlocked');
  };
  
  const handleSetupSkip = () => {
    setShowSetup(false);
  };
  
  const handleWelcomeComplete = () => {
    setEncryptionEnabled(isEncryptionSetUp());
    setStatus('unlocked');
    // Sync after restore
    syncFromServer();
  };
  
  // Dismiss auto-lock warning (extends timer)
  const dismissWarning = useCallback(() => {
    setAutoLockWarning(null);
    resetTimer();
  }, [resetTimer]);
  
  // Loading state
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }
  
  // Welcome screen for new devices
  if (status === 'welcome') {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }
  
  // Setup password (shown when explicitly requested)
  if (showSetup) {
    return (
      <SetupPassword 
        onComplete={handleSetupComplete} 
        onSkip={handleSetupSkip}
      />
    );
  }
  
  // Lock screen (shown when encryption is set up but session is locked)
  if (status === 'locked') {
    return <LockScreen onUnlock={handleUnlock} />;
  }
  
  // Unlocked - show main app
  return (
    <DataProvider>
      <WorkspaceProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={
              <Layout 
                onLock={encryptionEnabled ? handleLock : undefined}
                autoLockWarning={autoLockWarning}
                onDismissWarning={dismissWarning}
              />
            }>
              {/* New universal section route */}
              <Route path="section/:sectionId" element={<SectionPage />} />
              
              {/* Legacy routes - redirect to new section routes */}
              <Route index element={<Navigate to="/section/prompts" replace />} />
              <Route path="notes" element={<Navigate to="/section/notes" replace />} />
              <Route path="snippets" element={<Navigate to="/section/snippets" replace />} />
              <Route path="resources" element={<Navigate to="/section/resources" replace />} />
              
              {/* Content types manager */}
              <Route path="content-types" element={<ContentTypesManager />} />
              
              {/* Legacy content route - redirect to section route */}
              <Route path="content/:typeId" element={<LegacyRedirect />} />
              
              {/* Settings */}
              <Route path="settings" element={<Settings />} />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/section/prompts" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </WorkspaceProvider>
    </DataProvider>
  );
}
