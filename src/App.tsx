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
import { 
  isEncryptionSetUp, 
  isSessionActive, 
  loadEncryptedVault,
  clearSession,
} from './lib/crypto';
import { useAutoLock } from './lib/useAutoLock';

// Legacy route redirector - redirects old routes to new section routes
function LegacyRedirect() {
  const { typeId } = useParams<{ typeId: string }>();
  return <Navigate to={`/section/${typeId}`} replace />;
}

type AppStatus = 'loading' | 'setup' | 'locked' | 'unlocked';

// Auto-lock timeout (15 minutes)
const AUTO_LOCK_TIMEOUT_MS = 15 * 60 * 1000;

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
  
  useEffect(() => {
    // Register for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Store the event for later use
      (window as any).deferredPrompt = e;
    });
    
    // Check encryption status
    const checkStatus = () => {
      const encryptionSetup = isEncryptionSetUp();
      const sessionActive = isSessionActive();
      const hasVault = loadEncryptedVault() !== null;
      
      setEncryptionEnabled(encryptionSetup);
      
      if (encryptionSetup && hasVault) {
        // Encryption is set up
        if (sessionActive) {
          setStatus('unlocked');
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
  }, []);
  
  const handleUnlock = () => {
    setStatus('unlocked');
    setAutoLockWarning(null);
  };
  
  const handleSetupComplete = () => {
    setShowSetup(false);
    setEncryptionEnabled(true);
    setStatus('unlocked');
  };
  
  const handleSetupSkip = () => {
    setShowSetup(false);
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
