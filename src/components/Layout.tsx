import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './SidebarNew';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { ExportImport } from './ExportImport';
import { GistSync } from './GistSync';
import { ExportPanel } from './ExportPanel';
import { WorkspaceBar } from './workspaces/WorkspaceBar';

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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100 lg:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col">
        <Sidebar 
          onOpenSearch={() => setIsSearchOpen(true)} 
          onOpenExport={() => setIsExportOpen(true)}
          onOpenGist={() => setIsGistOpen(true)}
          onOpenExportPanel={() => setIsExportPanelOpen(true)}
        />
      </div>
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Bar (top) */}
        <div className="hidden lg:block">
          <WorkspaceBar />
        </div>
        
        {/* Mobile Navigation */}
        <MobileNav onOpenSearch={() => setIsSearchOpen(true)} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-900/50">
          <div className="min-h-full p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ExportImport isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <GistSync isOpen={isGistOpen} onClose={() => setIsGistOpen(false)} />
      <ExportPanel isOpen={isExportPanelOpen} onClose={() => setIsExportPanelOpen(false)} />
    </div>
  );
}
