/**
 * Create Workspace Modal
 * 
 * Modal for creating a new workspace with name, color, icon, and template options.
 */

import { useState } from 'react';
import { X, Shield, Briefcase, User, Folder, Code, BookOpen, Settings } from 'lucide-react';
import { useWorkspaces, WORKSPACE_COLORS } from '../../lib/WorkspaceContext';
import { cn } from '../../utils/cn';

const ICONS = [
  { name: 'Shield', icon: Shield },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'User', icon: User },
  { name: 'Folder', icon: Folder },
  { name: 'Code', icon: Code },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Settings', icon: Settings },
];

type TemplateType = 'empty' | 'default' | 'duplicate';

interface CreateWorkspaceModalProps {
  onClose: () => void;
}

export function CreateWorkspaceModal({ onClose }: CreateWorkspaceModalProps) {
  const { workspaces, addWorkspace, duplicateWorkspace, setActiveWorkspaceId } = useWorkspaces();
  
  const [name, setName] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0].value);
  const [icon, setIcon] = useState('Shield');
  const [template, setTemplate] = useState<TemplateType>('default');
  const [duplicateFromId, setDuplicateFromId] = useState(workspaces[0]?.id || '');
  
  const handleCreate = () => {
    if (!name.trim()) return;
    
    if (template === 'duplicate' && duplicateFromId) {
      const newWorkspace = duplicateWorkspace(duplicateFromId, name.trim());
      if (newWorkspace) {
        // Update color and icon
        // Note: duplicateWorkspace already creates it, we need to update
        setActiveWorkspaceId(newWorkspace.id);
      }
    } else {
      const newWorkspace = addWorkspace({
        name: name.trim(),
        color,
        icon,
      });
      
      // If default template, create default sections
      if (template === 'default') {
        // Sections will be created by the workspace context or another mechanism
        // For now, we just create the workspace
      }
      
      setActiveWorkspaceId(newWorkspace.id);
    }
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-bold text-zinc-100">New Workspace</h2>
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
              placeholder="My Workspace"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>
          
          {/* Color */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              {WORKSPACE_COLORS.map((c) => (
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
          </div>
          
          {/* Icon */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(({ name: iconName, icon: IconComponent }) => (
                <button
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-lg border transition-all",
                    icon === iconName
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  )}
                  title={iconName}
                >
                  <IconComponent className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
          
          {/* Template */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Template</label>
            <div className="space-y-2">
              <label className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                template === 'empty'
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              )}>
                <input
                  type="radio"
                  name="template"
                  value="empty"
                  checked={template === 'empty'}
                  onChange={() => setTemplate('empty')}
                  className="sr-only"
                />
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  template === 'empty' ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                )} />
                <div>
                  <div className="font-medium text-zinc-100">Empty</div>
                  <div className="text-xs text-zinc-500">No sections</div>
                </div>
              </label>
              
              <label className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                template === 'default'
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              )}>
                <input
                  type="radio"
                  name="template"
                  value="default"
                  checked={template === 'default'}
                  onChange={() => setTemplate('default')}
                  className="sr-only"
                />
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  template === 'default' ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                )} />
                <div>
                  <div className="font-medium text-zinc-100">Default</div>
                  <div className="text-xs text-zinc-500">Prompts, Notes, Snippets, Resources</div>
                </div>
              </label>
              
              {workspaces.length > 0 && (
                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  template === 'duplicate'
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                )}>
                  <input
                    type="radio"
                    name="template"
                    value="duplicate"
                    checked={template === 'duplicate'}
                    onChange={() => setTemplate('duplicate')}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    template === 'duplicate' ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                  )} />
                  <div className="flex-1">
                    <div className="font-medium text-zinc-100">Duplicate from</div>
                    <select
                      value={duplicateFromId}
                      onChange={(e) => setDuplicateFromId(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                    >
                      {workspaces.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </label>
              )}
            </div>
          </div>
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
            onClick={handleCreate}
            disabled={!name.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
