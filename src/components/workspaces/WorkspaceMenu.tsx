/**
 * Workspace Menu
 * 
 * Dropdown menu for workspace actions (rename, delete, duplicate, change color).
 */

import { useRef, useEffect } from 'react';
import { Edit2, Trash2, Copy, Palette } from 'lucide-react';
import { Workspace } from '../../types/sections';
import { WORKSPACE_COLORS } from '../../lib/WorkspaceContext';
import { cn } from '../../utils/cn';

interface WorkspaceMenuProps {
  workspace: Workspace;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChangeColor: (color: string) => void;
  onClose: () => void;
}

export function WorkspaceMenu({
  workspace,
  onRename,
  onDelete,
  onDuplicate,
  onChangeColor,
  onClose,
}: WorkspaceMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50 overflow-hidden"
    >
      {/* Rename */}
      <button
        onClick={onRename}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <Edit2 className="h-4 w-4" />
        Rename
      </button>
      
      {/* Change Color */}
      <div className="px-3 py-2 border-t border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">Color</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {WORKSPACE_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onChangeColor(color.value)}
              className={cn(
                "w-5 h-5 rounded-full transition-all hover:scale-110",
                workspace.color === color.value && "ring-2 ring-white ring-offset-1 ring-offset-zinc-900"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>
      
      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
      >
        <Copy className="h-4 w-4" />
        Duplicate
      </button>
      
      {/* Delete (only if not default) */}
      {!workspace.isDefault && (
        <button
          onClick={onDelete}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-zinc-800"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      )}
      
      {/* Default badge */}
      {workspace.isDefault && (
        <div className="px-3 py-1.5 text-xs text-zinc-500 border-t border-zinc-800">
          Default workspace cannot be deleted
        </div>
      )}
    </div>
  );
}
