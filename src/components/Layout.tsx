import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { ExportImport } from './ExportImport';
import { GistSync } from './GistSync';
import { ExportPanel } from './ExportPanel';
import { storageEnhanced } from '../lib/storage-enhanced';

export function Layout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGistOpen, setIsGistOpen] = useState(false);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K - Open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape - Close modals
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsExportOpen(false);
        setIsGistOpen(false);
        setIsExportPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update stats in sidebar
  useEffect(() => {
    const updateStats = () => {
      const promptsEl = document.getElementById('stat-prompts');
      const notesEl = document.getElementById('stat-notes');
      if (promptsEl) promptsEl.textContent = String(storageEnhanced.prompts.getAll().length);
      if (notesEl) notesEl.textContent = String(storageEnhanced.notes.getAll().length);
    };
    updateStats();
    
    // Update on storage change
    window.addEventListener('storage', updateStats);
    const interval = setInterval(updateStats, 2000);
    return () => {
      window.removeEventListener('storage', updateStats);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100 lg:flex-row">
      {/* Mobile Navigation */}
      <MobileNav onOpenSearch={() => setIsSearchOpen(true)} />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          onOpenSearch={() => setIsSearchOpen(true)} 
          onOpenExport={() => setIsExportOpen(true)}
          onOpenGist={() => setIsGistOpen(true)}
          onOpenExportPanel={() => setIsExportPanelOpen(true)}
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-900/50">
        <div className="min-h-full p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Global Modals */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ExportImport isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <GistSync isOpen={isGistOpen} onClose={() => setIsGistOpen(false)} />
      <ExportPanel isOpen={isExportPanelOpen} onClose={() => setIsExportPanelOpen(false)} />
    </div>
  );
}
