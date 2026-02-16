import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Terminal, 
  StickyNote, 
  Link as LinkIcon, 
  Database,
  Lock,
  Search,
  Download,
  Settings,
  Cloud,
  FileDown,
  Layers,
  Trash2,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { gistSync } from '../lib/storage-enhanced';
import { useData } from '../lib/DataContext';

// Clear Storage Confirmation Modal
function ClearStorageModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">Clear All Data</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-zinc-300">
            This will permanently delete all your local data, including:
          </p>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              All prompts and their categories
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              All notes and folders
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              All code snippets
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              All saved resources
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              Custom content types
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              Settings and preferences
            </li>
          </ul>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-xs text-amber-400">
              ⚠️ This action cannot be undone. Make sure you have a backup if you want to restore your data later.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Icon mapping for dynamic types
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal,
  StickyNote,
  Database,
  Link: LinkIcon,
  FileText: StickyNote,
  CheckSquare: Database,
  HelpCircle: Terminal,
  Code: Terminal,
};

// Map content type IDs to routes (for default types)
const TYPE_ROUTES: Record<string, string> = {
  prompts: '/',
  notes: '/notes',
  snippets: '/snippets',
  resources: '/resources',
};

interface SidebarProps {
  onOpenSearch: () => void;
  onOpenExport: () => void;
  onOpenGist: () => void;
  onOpenExportPanel: () => void;
}

export function Sidebar({ onOpenSearch, onOpenExport, onOpenGist, onOpenExportPanel }: SidebarProps) {
  const location = useLocation();
  const gistConfig = gistSync.getConfig();
  const isGistConnected = !!gistConfig.gistId;
  const { data } = useData();
  const types = data.contentTypes;
  const [showClearModal, setShowClearModal] = useState(false);

  const handleClearStorage = () => {
    // Clear all localStorage
    localStorage.clear();
    // Clear sessionStorage as well
    sessionStorage.clear();
    // Reload the page to reset all state
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-zinc-800 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-zinc-100">Pentest Hub</span>
          <p className="text-xs text-zinc-500">Private Vault</p>
        </div>
      </div>

      {/* Quick Search */}
      <div className="p-3">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Quick search...</span>
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Content
          </span>
          <Link
            to="/content-types"
            className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
            title="Manage content types"
          >
            <Layers className="h-3.5 w-3.5" />
          </Link>
        </div>
        
        {types.map((type) => {
          const route = TYPE_ROUTES[type.id] || `/content/${type.id}`;
          const isActive = location.pathname === route;
          const IconComponent = ICON_MAP[type.icon] || Terminal;
          const colorClass = type.color || 'emerald';

          return (
            <Link
              key={type.id}
              to={route}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive 
                  ? `bg-${colorClass}-600/10 text-${colorClass}-400 border-l-2 border-${colorClass}-500 -ml-0.5 pl-[calc(0.75rem+2px)]` 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
              )}
              style={isActive ? { borderLeftColor: `var(--color-${colorClass})` } : undefined}
            >
              <IconComponent className={cn("h-4 w-4", isActive && `text-${colorClass}-400`)} />
              <div className="flex-1">
                <div>{type.name}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-zinc-800 p-3 space-y-1">
        <button 
          onClick={() => setShowClearModal(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear Data</span>
        </button>
        <button 
          onClick={onOpenGist}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isGistConnected 
              ? "text-blue-400 hover:bg-blue-500/10" 
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
          )}
        >
          <Cloud className={cn("h-4 w-4", isGistConnected && "text-blue-400")} />
          <span>Gist Sync</span>
          {isGistConnected && (
            <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
          )}
        </button>
        <button 
          onClick={onOpenExportPanel}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
        >
          <FileDown className="h-4 w-4" />
          <span>Export</span>
        </button>
        <button 
          onClick={onOpenExport}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
        >
          <Download className="h-4 w-4" />
          <span>Backup / Restore</span>
        </button>
        <Link 
          to="/settings"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
            location.pathname === '/settings' && "text-emerald-400 bg-emerald-600/10"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400">
          <Lock className="h-4 w-4" />
          <span>Lock Vault</span>
        </button>
      </div>

      {/* Stats Footer */}
      <div className="border-t border-zinc-800 p-4">
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded bg-zinc-900 p-2">
            <div className="font-bold text-zinc-100" id="stat-prompts">-</div>
            <div className="text-zinc-500">Prompts</div>
          </div>
          <div className="rounded bg-zinc-900 p-2">
            <div className="font-bold text-zinc-100" id="stat-notes">-</div>
            <div className="text-zinc-500">Notes</div>
          </div>
        </div>
        
        {/* PWA Install hint */}
        <p className="mt-3 text-center text-xs text-zinc-600">
          Works offline • PWA Ready
        </p>
      </div>

      {/* Clear Storage Modal */}
      {showClearModal && (
        <ClearStorageModal
          onClose={() => setShowClearModal(false)}
          onConfirm={handleClearStorage}
        />
      )}
    </div>
  );
}
