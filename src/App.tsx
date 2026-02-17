import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Settings } from './pages/Settings';
import { ContentTypesManager } from './pages/ContentTypes';
import { SectionPage } from './pages/SectionPage';
import { DataProvider } from './lib/DataContext';
import { WorkspaceProvider } from './lib/WorkspaceContext';
import { useEffect } from 'react';

// Legacy route redirector - redirects old routes to new section routes
function LegacyRedirect() {
  const { typeId } = useParams<{ typeId: string }>();
  return <Navigate to={`/section/${typeId}`} replace />;
}

export function App() {
  useEffect(() => {
    // Register for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Store the event for later use
      (window as any).deferredPrompt = e;
    });
  }, []);

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
