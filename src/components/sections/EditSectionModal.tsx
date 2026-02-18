/**
 * Edit Section Modal
 * 
 * Modal for editing section properties (name, icon, color).
 * System sections can be edited but not deleted or have type changed.
 */

import { useState, useEffect } from 'react';
import { X, Folder, Terminal, FileText, Database, Link as LinkIcon, Bug, Globe, Table, Code, type LucideIcon } from 'lucide-react';
import { useWorkspaces } from '../../lib/WorkspaceContext';
import { WORKSPACE_COLORS } from '../../lib/WorkspaceContext';
import { cn } from '../../utils/cn';

const ICON_MAP: Record<string, LucideIcon> = {
  Terminal,
  StickyNote: FileText,
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

const ICON_OPTIONS = ['Folder', 'Terminal', 'FileText', 'Database', 'Link', 'Bug', 'Globe', 'Table', 'Code'];

interface EditSectionModalProps {
  sectionId: string;
  onClose: () => void;
}

export function EditSectionModal({ sectionId, onClose }: EditSectionModalProps) {
  const { allSections, updateSection } = useWorkspaces();
  
  const section = allSections.find(s => s.id === sectionId);
  
  const [name, setName] = useState(section?.name || '');
  const [icon, setIcon] = useState(section?.icon || 'Folder');
  const [color, setColor] = useState(section?.color || '');
  
  useEffect(() => {
    if (section) {
      setName(section.name);
      setIcon(section.icon);
      setColor(section.color || '');
    }
  }, [section]);
  
  if (!section) {
    return null;
  }
  
  const isSystem = section.isSystem || section.isDefault;
  
  const handleSave = () => {
    if (name.trim()) {
      updateSection(sectionId, {
        name: name.trim(),
        icon,
        color: color || undefined,
      });
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-bold text-zinc-100">Edit Section</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Section name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>
          
          {/* Icon */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(iconName => {
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
          
          {/* Color */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setColor('')}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                  !color ? "border-white bg-zinc-700" : "border-zinc-700 bg-zinc-700"
                )}
                title="No color"
              >
                <X className="h-3 w-3 text-zinc-400 mx-auto" />
              </button>
              {WORKSPACE_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all hover:scale-110",
                    color === c.value && "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Color appears as a dot in the sidebar
            </p>
          </div>
          
          {/* Type (readonly for system sections) */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Type</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <span className="text-zinc-300 capitalize">{section.typeId}</span>
              {isSystem && (
                <span className="text-xs text-zinc-500">(system - cannot change)</span>
              )}
            </div>
          </div>
          
          {/* System badge */}
          {isSystem && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <span className="text-xs text-blue-400">
                🔒 System section - can edit name/color but cannot delete
              </span>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
