import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './SidebarNew';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { ExportImport } from './ExportImport';
import { ExportPanel } from './ExportPanel';
import { WorkspaceBar } from './workspaces/WorkspaceBar';
import { SyncStatusBanner } from './sync/SyncStatusBanner';
import { AlertTriangle, X } from 'lucide-react';

interface LayoutProps {
  onLock?: () => void;
  autoLockWarning?: number | null;
  onDismissWarning?: () => void;
}

export function Layout({ onLock, autoLockWarning, onDismissWarning }: LayoutProps) {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  
  // Navigate to settings for sync actions
  const handlePull = () => {
    navigate('/settings');
  };
  
  const handlePush = () => {
    navigate('/settings');
  };

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
          onOpenExportPanel={() => setIsExportPanelOpen(true)}
          onLock={onLock}
        />
      </div>
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Bar (top) */}
        <div className="hidden lg:block">
          <WorkspaceBar />
        </div>
        
        {/* Auto-lock Warning Banner */}
        {autoLockWarning && autoLockWarning > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Auto-lock in <strong>{autoLockWarning}s</strong> due to inactivity
                </span>
              </div>
              <button
                onClick={onDismissWarning}
                className="text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10 text-sm"
              >
                Stay unlocked
              </button>
            </div>
          </div>
        )}
        
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
      <ExportPanel isOpen={isExportPanelOpen} onClose={() => setIsExportPanelOpen(false)} />
      
      {/* Sync Status Banner */}
      <SyncStatusBanner onPull={handlePull} onPush={handlePush} />
    </div>
  );
}
