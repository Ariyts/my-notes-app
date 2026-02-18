import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Settings } from './pages/Settings';
import { ContentTypesManager } from './pages/ContentTypes';
import { SectionPage } from './pages/SectionPage';
import { DataProvider } from './lib/DataContext';
import { WorkspaceProvider } from './lib/WorkspaceContext';
import { useEffect, useState, useCallback } from 'react';
import { autoLoadFromServer } from './lib/autoSync';
import { Loader2 } from 'lucide-react';

// Legacy route redirector - redirects old routes to new section routes
function LegacyRedirect() {
  const { typeId } = useParams<{ typeId: string }>();
  return <Navigate to={`/section/${typeId}`} replace />;
}

type AppStatus = 'loading' | 'loaded';

export function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Auto-load data from server on startup
  const loadData = useCallback(async () => {
    try {
      console.log('[App] Auto-loading data from server...');
      const result = await autoLoadFromServer();
      
      if (result.success) {
        console.log('[App] Auto-load successful:', result);
      } else {
        console.log('[App] Auto-load result:', result);
        // Not critical - will use localStorage as fallback
      }
    } catch (error) {
      console.error('[App] Auto-load failed:', error);
      setLoadError('Failed to load data from server');
    } finally {
      setStatus('loaded');
    }
  }, []);
  
  useEffect(() => {
    // Register for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    });
    
    // Auto-load data
    loadData();
  }, [loadData]);
  
  // Loading state with spinner
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <div className="mt-4 text-zinc-400">Loading data...</div>
      </div>
    );
  }
  
  // Show error but still render app (uses localStorage)
  if (loadError) {
    console.log('[App] Rendering with load error, using localStorage fallback');
  }
  
  // Main app
  return (
    <DataProvider>
      <WorkspaceProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
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
