import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Prompts } from './pages/Prompts';
import { Notes } from './pages/Notes';
import { Snippets } from './pages/Snippets';
import { Resources } from './pages/Resources';
import { Settings } from './pages/Settings';
import { useEffect } from 'react';
import { storage } from './lib/storage';

export function App() {
  useEffect(() => {
    // Seed initial data if empty
    storage.seed();
    
    // Register for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Store the event for later use
      (window as any).deferredPrompt = e;
    });
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Prompts />} />
          <Route path="notes" element={<Notes />} />
          <Route path="snippets" element={<Snippets />} />
          <Route path="resources" element={<Resources />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
