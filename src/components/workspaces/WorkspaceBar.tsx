/**
 * Workspace Bar
 * 
 * Top navigation bar for switching between workspaces.
 * Shows tabs for each workspace with add button.
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, Edit2, Trash2, Copy, Check, X } from 'lucide-react';
import { useWorkspaces, WORKSPACE_COLORS } from '../../lib/WorkspaceContext';
import { cn } from '../../utils/cn';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { WorkspaceMenu } from './WorkspaceMenu';

export function WorkspaceBar() {
  const navigate = useNavigate();
  const { 
    workspaces, 
    activeWorkspaceId, 
    sections,
    setActiveWorkspaceId,
    updateWorkspace,
    deleteWorkspace,
    duplicateWorkspace,
  } = useWorkspaces();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuWorkspaceId, setMenuWorkspaceId] = useState<string | null>(null);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  
  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
    setMenuWorkspaceId(null);
  };
  
  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateWorkspace(editingId, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Delete this workspace and all its sections?')) {
      deleteWorkspace(id);
    }
    setMenuWorkspaceId(null);
  };
  
  const handleDuplicate = (id: string) => {
    const workspace = workspaces.find(w => w.id === id);
    if (workspace) {
      duplicateWorkspace(id, `${workspace.name} (copy)`);
    }
    setMenuWorkspaceId(null);
  };
  
  // Handle workspace switch with navigation
  const handleWorkspaceSwitch = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    
    // Navigate to first section of new workspace
    const workspaceSections = sections.filter(s => s.workspaceId === workspaceId);
    if (workspaceSections.length > 0) {
      navigate(`/section/${workspaceSections[0].id}`);
    } else {
      // No sections - show empty state by navigating to a special route or staying
      navigate('/');
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-1 px-4 py-2 bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;
          const isEditing = editingId === workspace.id;
          const showMenu = menuWorkspaceId === workspace.id;
          
          return (
            <div key={workspace.id} className="relative">
              {isEditing ? (
                // Edit mode
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-emerald-500/50">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: workspace.color }}
                  />
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="bg-transparent text-sm text-zinc-100 focus:outline-none min-w-[100px] max-w-[200px]"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-0.5 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-0.5 text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                // Normal mode
                <button
                  onClick={() => handleWorkspaceSwitch(workspace.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all group",
                    isActive 
                      ? "bg-zinc-800 text-zinc-100 ring-1 ring-inset ring-zinc-700" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  )}
                >
                  {/* Color indicator */}
                  <div 
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 transition-all",
                      isActive && "ring-2 ring-offset-1 ring-offset-zinc-900"
                    )}
                    style={{ 
                      backgroundColor: workspace.color,
                      ringColor: isActive ? workspace.color : undefined
                    }}
                  />
                  
                  {/* Name */}
                  <span className="truncate max-w-[120px]">{workspace.name}</span>
                  
                  {/* Dropdown arrow for active */}
                  {isActive && (
                    <button
                      ref={menuAnchorRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuWorkspaceId(showMenu ? null : workspace.id);
                      }}
                      className="p-0.5 rounded hover:bg-zinc-700 transition-colors"
                    >
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 text-zinc-400 transition-transform",
                        showMenu && "rotate-180"
                      )} />
                    </button>
                  )}
                </button>
              )}
              
              {/* Dropdown menu via portal */}
              {showMenu && (
                <WorkspaceMenu
                  workspace={workspace}
                  anchorEl={menuAnchorRef.current}
                  onRename={() => handleStartEdit(workspace.id, workspace.name)}
                  onDelete={() => handleDelete(workspace.id)}
                  onDuplicate={() => handleDuplicate(workspace.id)}
                  onChangeColor={(color) => {
                    updateWorkspace(workspace.id, { color });
                    setMenuWorkspaceId(null);
                  }}
                  onClose={() => setMenuWorkspaceId(null)}
                />
              )}
            </div>
          );
        })}
        
        {/* Add workspace button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          title="Add workspace"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {/* Create modal */}
      {showCreateModal && (
        <CreateWorkspaceModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
