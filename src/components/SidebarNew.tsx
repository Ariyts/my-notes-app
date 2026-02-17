/**
 * Sidebar
 * 
 * Dynamic sidebar that generates navigation from sections configuration.
 */

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
  Trash2,
  AlertTriangle,
  X,
  Plus,
  Folder,
  Table,
  Bug,
  Globe,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { gistSync } from '../lib/storage-enhanced';
import { useSections } from '../lib/SectionsContext';
import { ContentTypeId } from '../types/sections';

// Icon mapping for dynamic types
const ICON_MAP: Record<string, LucideIcon> = {
  Terminal,
  StickyNote,
  Database,
  Link: LinkIcon,
  FileText,
  CheckSquare: Database,
  HelpCircle: Terminal,
  Code: Terminal,
  Table,
  Bug,
  Globe,
  Folder,
};

// Clear Storage Confirmation Modal
function ClearStorageModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">Clear All Data</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-zinc-300">
            This will permanently delete all your local data, including:
          </p>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              All sections and their content
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              Custom configurations
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              Settings and preferences
            </li>
          </ul>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-xs text-amber-400">
              ⚠️ This action cannot be undone. Make sure you have a backup.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button onClick={onClose} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button onClick={onConfirm} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Section Modal
function AddSectionModal({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void; 
  onAdd: (section: { name: string; icon: string; typeId: string }) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [typeId, setTypeId] = useState('cards');

  const typeOptions = [
    { value: 'cards', label: 'Cards', description: 'Card grid with preview (like Prompts)' },
    { value: 'folders', label: 'Folders', description: 'Hierarchical notes (like Notes)' },
    { value: 'commands', label: 'Commands', description: 'Command snippets grouped by tool' },
    { value: 'links', label: 'Links', description: 'Link collection with categories' },
    { value: 'table', label: 'Table', description: 'Simple table with sorting' },
  ];

  const iconOptions = ['Folder', 'Terminal', 'FileText', 'Database', 'Link', 'Bug', 'Globe', 'Table', 'Code'];

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd({ name: name.trim(), icon, typeId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-bold text-zinc-100">Add New Section</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My New Section"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map(iconName => {
                const IconComponent = ICON_MAP[iconName] || Folder;
                return (
                  <button
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                      icon === iconName
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    )}
                    title={iconName}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Type</label>
            <div className="space-y-2">
              {typeOptions.map(type => (
                <button
                  key={type.value}
                  onClick={() => setTypeId(type.value)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors",
                    typeId === type.value
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <div className="font-medium text-zinc-100">{type.label}</div>
                  <div className="text-xs text-zinc-500">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const { sections, addSection, deleteSection, clearAll } = useSections();
  const [showClearModal, setShowClearModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleClearStorage = () => {
    clearAll();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleAddSection = (data: { name: string; icon: string; typeId: string }) => {
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    addSection({
      id,
      name: data.name,
      icon: data.icon,
      typeId: data.typeId as ContentTypeId,
    });
    setShowAddModal(false);
  };

  // Stats for footer
  const totalItems = sections.reduce((sum, s) => {
    const items = JSON.parse(localStorage.getItem(`section-data-${s.id}`) || '[]');
    return sum + items.length;
  }, 0);

  return (
    <div className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-zinc-800 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-zinc-100">Pentest Hub</span>
          <p className="text-xs text-zinc-500">Dynamic Vault</p>
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
            Sections
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-emerald-400"
            title="Add new section"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        
        {sections.map((section) => {
          const route = `/section/${section.id}`;
          const isActive = location.pathname === route;
          const IconComponent = ICON_MAP[section.icon] || Terminal;

          return (
            <Link
              key={section.id}
              to={route}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive 
                  ? "bg-emerald-600/10 text-emerald-400 border-l-2 border-emerald-500 -ml-0.5 pl-[calc(0.75rem+2px)]" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
              )}
            >
              <IconComponent className={cn("h-4 w-4", isActive && "text-emerald-400")} />
              <div className="flex-1 truncate">
                {section.name}
              </div>
              {!section.isDefault && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete section "${section.name}"?`)) {
                      deleteSection(section.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5"
                  title="Delete section"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
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
            <div className="font-bold text-zinc-100">{sections.length}</div>
            <div className="text-zinc-500">Sections</div>
          </div>
          <div className="rounded bg-zinc-900 p-2">
            <div className="font-bold text-zinc-100">{totalItems}</div>
            <div className="text-zinc-500">Items</div>
          </div>
        </div>
        
        <p className="mt-3 text-center text-xs text-zinc-600">
          Works offline • PWA Ready
        </p>
      </div>

      {/* Modals */}
      {showClearModal && (
        <ClearStorageModal
          onClose={() => setShowClearModal(false)}
          onConfirm={handleClearStorage}
        />
      )}
      {showAddModal && (
        <AddSectionModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSection}
        />
      )}
    </div>
  );
}
