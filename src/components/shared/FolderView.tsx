/**
 * Shared FolderView Component
 * Universal folder/note management UI used by Notes and DynamicContent
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Plus,
  Search,
  Copy,
  Trash2,
  Check,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Eye,
  Columns,
  Edit3,
  FileCode,
  LayoutTemplate,
  Archive,
  FileDown,
  FileUp,
  FolderPlus,
  X,
  Pencil,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Generic item type for folder view
export interface FolderItem {
  id: string;
  title: string;
  category: string;
  content: string;
  tags?: string[];
  updatedAt?: string;
  [key: string]: unknown;
}

export interface FolderViewProps {
  // Data
  items: FolderItem[];
  categories: string[];
  
  // State
  selectedItem: FolderItem | null;
  onSelect: (item: FolderItem) => void;
  
  // CRUD operations
  onCreate: (category?: string) => void;
  onCreateFolder: (folderName: string) => void;
  onUpdate: (id: string, data: Partial<FolderItem>) => void;
  onDelete: (id: string) => void;
  
  // Import/Export
  onExportAll?: () => void;
  onImport?: (files: FileList) => void;
  onExportCurrent?: () => void;
  
  // UI config
  title: string;
  predefinedCategories?: string[];
  showTemplates?: boolean;
  templates?: { name: string; category: string; content: string }[];
  onSelectTemplate?: (template: { name: string; category: string; content: string }) => void;
  
  // Editor state
  editData: FolderItem;
  setEditData: (data: FolderItem) => void;
  hasUnsaved: boolean;
  setHasUnsaved: (v: boolean) => void;
}

export function FolderView({
  items,
  categories,
  selectedItem,
  onSelect,
  onCreate,
  onCreateFolder,
  onUpdate,
  onDelete,
  onExportAll,
  onImport,
  onExportCurrent,
  title,
  predefinedCategories = [],
  showTemplates = false,
  templates = [],
  onSelectTemplate,
  editData,
  setEditData,
  hasUnsaved,
  setHasUnsaved,
}: FolderViewProps) {
  // UI State
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'split'>('split');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  
  // Modal states
  const [showImportExport, setShowImportExport] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Renaming states
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renamingFolderValue, setRenamingFolderValue] = useState('');
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renamingItemValue, setRenamingItemValue] = useState('');
  const renamingJustCompleted = useRef(false);

  // Initialize expanded folders
  useEffect(() => {
    if (items.length > 0) {
      const roots = new Set(items.map(n => n.category.split('/')[0]));
      setExpandedFolders(roots);
    }
  }, []);

  // Filter items
  const filteredItems = useMemo(() => 
    items.filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.category.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    ), [items, search]
  );

  // Get all existing folders from items
  const existingFolders = useMemo(() => {
    const folders = new Set<string>();
    items.forEach(item => {
      folders.add(item.category);
    });
    return Array.from(folders).sort();
  }, [items]);

  // Build folder tree
  const tree = useMemo(() => {
    const treeObj: Record<string, Record<string, FolderItem[]>> = {};
    
    filteredItems.forEach(item => {
      const parts = item.category.split('/');
      const root = parts[0] || 'Uncategorized';
      const sub = parts.slice(1).join('/') || '_root';
      
      if (!treeObj[root]) treeObj[root] = {};
      if (!treeObj[root][sub]) treeObj[root][sub] = [];
      treeObj[root][sub].push(item);
    });
    
    return treeObj;
  }, [filteredItems]);

  // Handlers
  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(editData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleFolderClick = (folderPath: string) => {
    onCreate(folderPath);
  };

  const handleRenameFolder = (oldPath: string, newPath: string) => {
    // Prevent double execution from Enter + onBlur
    if (renamingJustCompleted.current) {
      renamingJustCompleted.current = false;
      return;
    }
    
    // Validate
    const trimmedNewPath = newPath.trim();
    if (!trimmedNewPath || trimmedNewPath === oldPath) {
      return;
    }
    
    // Mark as completed to prevent onBlur from firing again
    renamingJustCompleted.current = true;
    
    // Update all items in this folder
    items.forEach(item => {
      if (item.category === oldPath) {
        onUpdate(item.id, { category: trimmedNewPath });
      } else if (item.category.startsWith(oldPath + '/')) {
        onUpdate(item.id, { category: item.category.replace(oldPath + '/', trimmedNewPath + '/') });
      }
    });
  };

  const handleRenameItem = (itemId: string, newTitle: string) => {
    // Prevent double execution
    if (renamingJustCompleted.current) {
      renamingJustCompleted.current = false;
      return;
    }
    
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;
    
    renamingJustCompleted.current = true;
    onUpdate(itemId, { title: trimmedTitle });
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onImport) return;
    
    setImportStatus('Importing...');
    await onImport(files);
    setImportStatus('Import complete!');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTimeout(() => setImportStatus(null), 3000);
  };

  // Save handler
  const handleSave = useCallback(() => {
    if (!selectedItem) return;
    onUpdate(selectedItem.id, {
      title: editData.title,
      category: editData.category,
      content: editData.content,
      tags: editData.tags,
    });
    setHasUnsaved(false);
  }, [selectedItem, editData, onUpdate, setHasUnsaved]);

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsaved) handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsaved, handleSave]);

  const handleDelete = () => {
    if (!selectedItem || !confirm('Delete this item?')) return;
    onDelete(selectedItem.id);
  };

  const allCategories = [...new Set([...predefinedCategories, ...categories, ...existingFolders])].sort();

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sidebar Tree */}
      <div className="flex w-72 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="border-b border-zinc-800 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">{title}</h2>
            <div className="flex items-center gap-1">
              {onExportAll && onImport && (
                <button 
                  onClick={() => setShowImportExport(!showImportExport)}
                  className={cn(
                    "rounded-lg p-1.5 text-zinc-300 hover:bg-zinc-600",
                    showImportExport && "bg-zinc-600"
                  )}
                  title="Import/Export"
                >
                  <Archive className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={() => setShowNewFolder(true)}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
              <button 
                onClick={() => onCreate()}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New Note"
              >
                <Plus className="h-4 w-4" />
              </button>
              {showTemplates && onSelectTemplate && (
                <button 
                  onClick={() => onSelectTemplate(templates[0] || { name: 'New', category: 'General', content: '' })}
                  className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500"
                  title="New from Template"
                >
                  <LayoutTemplate className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="mb-3 rounded-lg bg-zinc-800/50 p-3">
              <div className="text-xs font-medium text-zinc-400 mb-2">Create New Folder</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Folder name (e.g., Web/XSS)"
                  className="flex-1 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                  className="rounded bg-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1.5">
                Use / for subfolders: e.g., "Web/XSS" or "Cloud/AWS"
              </div>
            </div>
          )}

          {/* Import/Export Panel */}
          {showImportExport && onExportAll && onImport && (
            <div className="mb-3 rounded-lg bg-zinc-800/50 p-3 space-y-2">
              <div className="text-xs font-medium text-zinc-400 mb-2">Obsidian Sync</div>
              
              <div className="flex gap-2">
                <button
                  onClick={onExportAll}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export ZIP
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-600/30 cursor-pointer">
                  <FileUp className="h-3.5 w-3.5" />
                  Import
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.zip"
                    multiple
                    className="hidden"
                    onChange={handleImportFiles}
                  />
                </label>
              </div>

              {selectedItem && onExportCurrent && (
                <button
                  onClick={onExportCurrent}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export Current
                </button>
              )}

              {importStatus && (
                <div className="text-xs text-center text-zinc-400 py-1">
                  {importStatus}
                </div>
              )}

              <div className="text-[10px] text-zinc-500 text-center">
                Compatible with Obsidian vaults
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(tree).sort().map(([rootCategory, subCategories]) => (
            <div key={rootCategory} className="mb-1">
              <div className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 group">
                <button
                  onClick={() => toggleFolder(rootCategory)}
                  className="flex items-center gap-2 flex-1"
                >
                  {expandedFolders.has(rootCategory) ? (
                    <>
                      <ChevronDown className="h-3 w-3 text-zinc-500" />
                      <FolderOpen className="h-4 w-4 text-amber-500" />
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3 text-zinc-500" />
                      <Folder className="h-4 w-4 text-amber-500/70" />
                    </>
                  )}
                  {renamingFolder === rootCategory ? (
                    <input
                      value={renamingFolderValue}
                      onChange={(e) => setRenamingFolderValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameFolder(rootCategory, renamingFolderValue);
                          setRenamingFolder(null);
                        }
                        if (e.key === 'Escape') { setRenamingFolder(null); }
                      }}
                      onBlur={() => {
                        // Only rename if not already completed via Enter
                        if (renamingFolder === rootCategory) {
                          handleRenameFolder(rootCategory, renamingFolderValue);
                          setRenamingFolder(null);
                        }
                      }}
                      className="bg-zinc-700 px-1 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span>{rootCategory}</span>
                  )}
                </button>
                <span className="text-xs text-zinc-600 mr-1">
                  {Object.values(subCategories).flat().length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFolderClick(rootCategory); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-emerald-400 hover:bg-emerald-500/20 transition-opacity"
                  title="Add note to this folder"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenamingFolder(rootCategory); setRenamingFolderValue(rootCategory); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-zinc-400 hover:bg-zinc-700 transition-opacity"
                  title="Rename folder"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {expandedFolders.has(rootCategory) && (
                <div className="ml-3 border-l border-zinc-800 pl-2">
                  {Object.entries(subCategories).sort().map(([subCategory, categoryItems]) => (
                    <div key={subCategory} className="mt-1">
                      {subCategory !== '_root' && (
                        <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-500 group">
                          <Folder className="h-3 w-3 text-amber-500/50" />
                          {renamingFolder === `${rootCategory}/${subCategory}` ? (
                            <input
                              value={renamingFolderValue}
                              onChange={(e) => setRenamingFolderValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // For subfolders, construct the new full path
                                  const newFullPath = renamingFolderValue.includes('/') 
                                    ? renamingFolderValue 
                                    : `${rootCategory}/${renamingFolderValue}`;
                                  handleRenameFolder(`${rootCategory}/${subCategory}`, newFullPath);
                                  setRenamingFolder(null);
                                }
                                if (e.key === 'Escape') { setRenamingFolder(null); }
                              }}
                              onBlur={() => {
                                if (renamingFolder === `${rootCategory}/${subCategory}`) {
                                  const newFullPath = renamingFolderValue.includes('/') 
                                    ? renamingFolderValue 
                                    : `${rootCategory}/${renamingFolderValue}`;
                                  handleRenameFolder(`${rootCategory}/${subCategory}`, newFullPath);
                                  setRenamingFolder(null);
                                }
                              }}
                              className="bg-zinc-700 px-1 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="flex-1">{subCategory}</span>
                              <button
                                onClick={() => handleFolderClick(`${rootCategory}/${subCategory}`)}
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-emerald-400 hover:bg-emerald-500/20 transition-opacity"
                                title="Add note to this subfolder"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => { setRenamingFolder(`${rootCategory}/${subCategory}`); setRenamingFolderValue(subCategory); }}
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-zinc-400 hover:bg-zinc-700 transition-opacity"
                                title="Rename subfolder"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors group",
                            selectedItem?.id === item.id 
                              ? "bg-emerald-600/20 text-emerald-400" 
                              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          {renamingItem === item.id ? (
                            <input
                              value={renamingItemValue}
                              onChange={(e) => setRenamingItemValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleRenameItem(item.id, renamingItemValue);
                                  setRenamingItem(null);
                                }
                                if (e.key === 'Escape') { setRenamingItem(null); }
                              }}
                              onBlur={() => {
                                if (renamingItem === item.id) {
                                  handleRenameItem(item.id, renamingItemValue);
                                  setRenamingItem(null);
                                }
                              }}
                              className="bg-zinc-700 px-1 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="truncate flex-1 cursor-pointer" onClick={() => onSelect(item)}>{item.title}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setRenamingItem(item.id); setRenamingItemValue(item.title); }}
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-zinc-400 hover:bg-zinc-700 transition-opacity"
                                title="Rename"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(tree).length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-500">
              No items found
            </div>
          )}
        </div>

        {/* Category Quick Add */}
        <div className="border-t border-zinc-800 p-2">
          <select 
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value=""
            onChange={(e) => {
              if (e.target.value && selectedItem) {
                setEditData({ ...editData, category: e.target.value });
                setHasUnsaved(true);
              }
            }}
          >
            <option value="">Quick set folder...</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Editor/View Area */}
      <div className="flex flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur overflow-hidden">
        {selectedItem ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input
                  value={editData.title}
                  onChange={(e) => { setEditData({ ...editData, title: e.target.value }); setHasUnsaved(true); }}
                  className="bg-transparent text-xl font-bold text-zinc-100 focus:outline-none flex-1 min-w-0"
                  placeholder="Title"
                />
                {hasUnsaved && (
                  <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                    Unsaved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg bg-zinc-800 p-0.5">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === 'edit' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                    title="Edit Mode"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === 'split' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                    title="Split View"
                  >
                    <Columns className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('view')}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === 'view' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                    title="Preview Mode"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button 
                  onClick={handleCopyContent}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  title="Copy content"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                
                <button 
                  onClick={handleSave}
                  disabled={!hasUnsaved}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    hasUnsaved 
                      ? "bg-emerald-600 text-white hover:bg-emerald-500" 
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  Save
                </button>
                
                <button 
                  onClick={handleDelete}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Category & Tags Bar */}
            <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Folder:</span>
                <select
                  value={editData.category}
                  onChange={(e) => { setEditData({ ...editData, category: e.target.value }); setHasUnsaved(true); }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select folder...</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  value={editData.category}
                  onChange={(e) => { setEditData({ ...editData, category: e.target.value }); setHasUnsaved(true); }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="or type new folder"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {allCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-zinc-500">Tags:</span>
                <input
                  value={editData.tags?.join(', ') || ''}
                  onChange={(e) => { setEditData({ ...editData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }); setHasUnsaved(true); }}
                  className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="tag1, tag2, tag3..."
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={cn("flex flex-col overflow-hidden", viewMode === 'split' ? "w-1/2 border-r border-zinc-800" : "flex-1")}>
                  <div className="flex items-center justify-between bg-zinc-800/50 px-3 py-1 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-3 w-3" />
                      <span>Markdown Editor</span>
                    </div>
                    <span>{editData.content.length} chars</span>
                  </div>
                  <textarea
                    value={editData.content}
                    onChange={(e) => { setEditData({ ...editData, content: e.target.value }); setHasUnsaved(true); }}
                    className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm text-zinc-300 focus:outline-none"
                    placeholder="Type your markdown here..."
                    spellCheck={false}
                  />
                </div>
              )}
              
              {(viewMode === 'view' || viewMode === 'split') && (
                <div className={cn("flex flex-col overflow-hidden", viewMode === 'split' ? "w-1/2" : "flex-1")}>
                  <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-500">
                    <Eye className="h-3 w-3" />
                    <span>Preview</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="prose prose-invert max-w-none prose-headings:text-zinc-100 prose-a:text-emerald-400 prose-code:text-emerald-300 prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !match;
                            return !isInline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {editData.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-zinc-500">
            <FileText className="mb-4 h-16 w-16 text-zinc-700" />
            <p className="text-lg font-medium">No item selected</p>
            <p className="mt-1 text-sm">Select an item from the sidebar or create a new one</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </button>
              <button
                onClick={() => onCreate()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
