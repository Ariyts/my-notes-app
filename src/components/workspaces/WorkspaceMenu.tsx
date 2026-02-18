/**
 * Workspace Menu
 * 
 * Dropdown menu for workspace actions (rename, delete, duplicate, change color).
 */

import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, Copy, Palette } from 'lucide-react';
import { Workspace } from '../../types/sections';
import { WORKSPACE_COLORS } from '../../lib/WorkspaceContext';
import { cn } from '../../utils/cn';

interface WorkspaceMenuProps {
  workspace: Workspace;
  anchorEl: HTMLElement | null;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChangeColor: (color: string) => void;
  onClose: () => void;
}

export function WorkspaceMenu({
  workspace,
  anchorEl,
  onRename,
  onDelete,
  onDuplicate,
  onChangeColor,
  onClose,
}: WorkspaceMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Position menu relative to anchor
  const position = anchorEl ? {
    top: anchorEl.getBoundingClientRect().bottom + 4,
    left: anchorEl.getBoundingClientRect().left,
  } : { top: 0, left: 0 };
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorEl]);
  
  // Close on scroll
  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [onClose]);
  
  if (!anchorEl) return null;
  
  const menuContent = (
    <div
      ref={menuRef}
      className="fixed w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl z-[100] overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${Math.min(position.left, window.innerWidth - 200)}px`,
      }}
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
  
  // Render in portal to escape overflow constraints
  return createPortal(menuContent, document.body);
}
