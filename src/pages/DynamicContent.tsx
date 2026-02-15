/**
 * Dynamic Content Page
 * Universal page for custom content types with full functionality
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Plus,
  Search,
  Copy,
  Edit2,
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
  Download,
  Archive,
  FileDown,
  FileUp,
  Star,
  StarOff,
  Grid,
  List,
  Table2,
  ExternalLink,
  Tag,
  FolderPlus,
  X,
  Pencil,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useData } from '../lib/DataContext';
import { ContentTypeConfig, generateContentId } from '../lib/contentTypes';
import {
  createNotesArchive,
  importNotesFromFiles,
  importNotesFromZip,
  noteToMarkdown,
  getNoteFilename,
} from '../lib/obsidianSync';
import { cn } from '../utils/cn';

// Predefined categories for folder types
const DEFAULT_CATEGORIES = [
  'General',
  'Important',
  'Archive',
  'Work',
  'Personal',
];

export function DynamicContent() {
  const { typeId } = useParams<{ typeId: string }>();
  const { data, getChangelog } = useData();

  // Find the content type config
  const typeConfig = data.contentTypes.find(t => t.id === typeId);

  // Load items from localStorage
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  // Favorites (for cards model)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Reload data when typeId changes
  useEffect(() => {
    if (!typeId) return;
    
    // Load items
    const savedItems = localStorage.getItem(`content-${typeId}`);
    setItems(savedItems ? JSON.parse(savedItems) : []);
    
    // Load favorites
    const savedFavorites = localStorage.getItem(`content-${typeId}-favorites`);
    setFavorites(savedFavorites ? new Set(JSON.parse(savedFavorites)) : new Set());
    
    // Reset other state
    setSearch('');
    setFilter('all');
    setSelectedItem(null);
    setIsEditing(false);
    setEditData({});
    setHasUnsaved(false);
    setShowImportExport(false);
    setShowFavoritesOnly(false);
    setExpandedFolders(new Set());
  }, [typeId]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'split'>('split');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!typeConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-zinc-500">
        <FileText className="mb-4 h-16 w-16 text-zinc-700" />
        <p className="text-lg font-medium">Content type not found</p>
        <p className="mt-1 text-sm">Type ID: {typeId}</p>
      </div>
    );
  }

  // Save items to localStorage (use typeId directly to ensure correct key)
  const saveItems = (newItems: Record<string, unknown>[]) => {
    setItems(newItems);
    localStorage.setItem(`content-${typeId}`, JSON.stringify(newItems));
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(`content-${typeId}-favorites`, JSON.stringify([...next]));
      return next;
    });
  };

  // Create new item
  const handleCreate = () => {
    const newItem: Record<string, unknown> = {
      id: generateContentId(),
      contentTypeId: typeId,
      updatedAt: new Date().toISOString(),
    };

    typeConfig.fields.forEach(field => {
      if (field.default) {
        newItem[field.name] = field.default;
      } else if (field.type === 'tags') {
        newItem[field.name] = [];
      } else if (field.type === 'textarea') {
        newItem[field.name] = '';
      } else {
        newItem[field.name] = '';
      }
    });

    // For folders, add default content
    if (typeConfig.displayModel === 'folders') {
      newItem['content'] = `# New Item\n\nStart writing here...\n\n## Section\n\n- Point 1\n- Point 2`;
    }

    setEditData(newItem);
    setIsEditing(true);
    setSelectedItem(null);
    setHasUnsaved(false);
    setViewMode('edit');
  };

  // Create from template
  const handleCreateFromTemplate = (template: { name: string; category: string; content: string }) => {
    const newItem: Record<string, unknown> = {
      id: generateContentId(),
      contentTypeId: typeId,
      updatedAt: new Date().toISOString(),
      title: template.name,
      category: template.category,
      content: template.content,
      tags: [],
    };

    typeConfig.fields.forEach(field => {
      if (!newItem[field.name] && field.default) {
        newItem[field.name] = field.default;
      }
    });

    setEditData(newItem);
    setIsEditing(true);
    setSelectedItem(null);
    setHasUnsaved(false);
    setViewMode('edit');
  };

  // Create item in specific folder
  const handleCreateInFolder = (folderPath: string) => {
    const newItem: Record<string, unknown> = {
      id: generateContentId(),
      contentTypeId: typeId,
      updatedAt: new Date().toISOString(),
      title: 'Untitled',
      category: folderPath,
      content: `# New Item\n\nStart writing here...\n\n## Section\n\n- Point 1\n- Point 2`,
      tags: [],
    };

    typeConfig.fields.forEach(field => {
      if (!newItem[field.name] && field.default) {
        newItem[field.name] = field.default;
      }
    });

    setEditData(newItem);
    setIsEditing(true);
    setSelectedItem(null);
    setHasUnsaved(false);
    setViewMode('edit');
    setExpandedFolders(prev => new Set([...prev, folderPath.split('/')[0]]));
  };

  // Create new folder
  const handleCreateFolder = (folderName: string) => {
    const newItem: Record<string, unknown> = {
      id: generateContentId(),
      contentTypeId: typeId,
      updatedAt: new Date().toISOString(),
      title: 'Welcome to ' + folderName,
      category: folderName,
      content: `# Welcome to ${folderName}\n\nThis is a new folder. Start organizing your items here!`,
      tags: [],
    };

    saveItems([...items, newItem]);
    setEditData(newItem);
    setSelectedItem(newItem);
    setIsEditing(false);
    setHasUnsaved(false);
    setExpandedFolders(prev => new Set([...prev, folderName.split('/')[0]]));
  };

  // Rename folder (update all items in that folder)
  const handleRenameFolder = (oldPath: string, newPath: string) => {
    const categoryField = typeConfig.categoryField || 'category';
    const newItems = items.map(item => {
      const category = String(item[categoryField] || '');
      if (category === oldPath) {
        return { ...item, [categoryField]: newPath, updatedAt: new Date().toISOString() };
      }
      if (category.startsWith(oldPath + '/')) {
        return { ...item, [categoryField]: category.replace(oldPath + '/', newPath + '/'), updatedAt: new Date().toISOString() };
      }
      return item;
    });
    saveItems(newItems);
  };

  // Rename item
  const handleRenameItem = (itemId: string, newTitle: string) => {
    const newItems = items.map(item => {
      if (item.id === itemId) {
        return { ...item, title: newTitle, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    saveItems(newItems);
    
    // Update selectedItem if it's the renamed item
    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...selectedItem, title: newTitle });
      setEditData({ ...editData, title: newTitle });
    }
  };

  // Select item
  const selectItem = (item: Record<string, unknown>) => {
    if (hasUnsaved && !confirm('Discard unsaved changes?')) return;
    setSelectedItem(item);
    setEditData({ ...item });
    setHasUnsaved(false);
    setIsEditing(false);
  };

  // Edit item
  const handleEdit = (item: Record<string, unknown>) => {
    setEditData({ ...item });
    setIsEditing(true);
    setHasUnsaved(false);
  };

  // Save item
  const handleSave = useCallback(() => {
    if (!editData['id']) {
      editData['id'] = generateContentId();
    }
    editData['updatedAt'] = new Date().toISOString();

    const existingIndex = items.findIndex(i => i.id === editData['id']);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex] = editData;
      saveItems(newItems);
    } else {
      saveItems([...items, editData]);
    }

    setHasUnsaved(false);
    setIsEditing(false);
    setSelectedItem(editData);
  }, [editData, items]);

  // Ctrl+S
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

  // Delete item
  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      saveItems(items.filter(i => i.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  // Copy
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export all as ZIP (for folders)
  const handleExportAll = async () => {
    if (items.length === 0) return;

    try {
      // Convert items to notes format
      const notes = items.map(item => ({
        id: String(item.id),
        title: String(item['title'] || 'Untitled'),
        category: String(item['category'] || 'General'),
        content: String(item['content'] || ''),
        tags: (item['tags'] as string[]) || [],
        updatedAt: String(item['updatedAt'] || new Date().toISOString()),
      }));

      const blob = await createNotesArchive(notes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${typeConfig.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      let imported: Partial<{ title: string; content: string; category: string; tags: string[] }>[] = [];

      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        setImportStatus('Importing from ZIP...');
        imported = await importNotesFromZip(files[0]);
      } else {
        setImportStatus(`Importing ${files.length} file(s)...`);
        imported = await importNotesFromFiles(files);
      }

      let added = 0;
      for (const item of imported) {
        if (item.title && item.content) {
          const newItem: Record<string, unknown> = {
            id: generateContentId(),
            contentTypeId: typeId,
            updatedAt: new Date().toISOString(),
            title: item.title,
            content: item.content,
            category: item.category || 'Imported',
            tags: item.tags || [],
          };
          items.push(newItem);
          added++;
        }
      }

      saveItems([...items]);
      setImportStatus(`Imported ${added} item(s)`);
    } catch (error) {
      setImportStatus('Import failed');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setImportStatus(null), 3000);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = typeConfig.fields.some(field => {
        const value = item[field.name];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(search.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(v => String(v).toLowerCase().includes(search.toLowerCase()));
        }
        return false;
      });

      const categoryField = typeConfig.categoryField || 'category';
      const matchesCategory = filter === 'all' || item[categoryField] === filter;
      const matchesFavorites = !showFavoritesOnly || favorites.has(String(item.id));

      return matchesSearch && matchesCategory && matchesFavorites;
    });
  }, [items, search, filter, showFavoritesOnly, favorites, typeConfig]);

  // Get unique categories
  const categories = useMemo(() => {
    const categoryField = typeConfig.categoryField || 'category';
    const cats = new Set(items.map(i => String(i[categoryField] || 'General')));
    return [...cats].sort();
  }, [items, typeConfig]);

  // Drag end for cards
  const handleDragEnd = (event: DragEndEvent) => {
    // Could implement reorder
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{typeConfig.name}</h1>
          <p className="text-sm text-zinc-500">
            {items.length} items
            {!typeConfig.isDefault && <span className="ml-2 text-amber-400">(custom)</span>}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          New {typeConfig.displayModel === 'folders' ? 'Item' : 'Item'}
        </button>
      </div>

      {/* Render based on display model */}
      {typeConfig.displayModel === 'folders' && (
        <FolderView
          config={typeConfig}
          items={filteredItems}
          allItems={items}
          categories={categories}
          selectedItem={selectedItem}
          onSelect={selectItem}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          editData={editData}
          setEditData={setEditData}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          handleSave={handleSave}
          hasUnsaved={hasUnsaved}
          setHasUnsaved={setHasUnsaved}
          search={search}
          setSearch={setSearch}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          showImportExport={showImportExport}
          setShowImportExport={setShowImportExport}
          handleExportAll={handleExportAll}
          handleImport={handleImport}
          importStatus={importStatus}
          fileInputRef={fileInputRef}
          handleCreate={handleCreate}
          handleCreateFromTemplate={handleCreateFromTemplate}
          handleCreateInFolder={handleCreateInFolder}
          handleCreateFolder={handleCreateFolder}
          handleRenameFolder={handleRenameFolder}
          handleRenameItem={handleRenameItem}
        />
      )}

      {typeConfig.displayModel === 'cards' && (
        <CardsView
          config={typeConfig}
          items={filteredItems}
          allItems={items}
          categories={categories}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          showFavoritesOnly={showFavoritesOnly}
          setShowFavoritesOnly={setShowFavoritesOnly}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          cardViewMode={cardViewMode}
          setCardViewMode={setCardViewMode}
          sensors={sensors}
          handleDragEnd={handleDragEnd}
          handleCreate={handleCreate}
        />
      )}

      {typeConfig.displayModel === 'table' && (
        <TableView
          config={typeConfig}
          items={filteredItems}
          search={search}
          setSearch={setSearch}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
          handleCreate={handleCreate}
        />
      )}

      {(typeConfig.displayModel === 'links' || typeConfig.displayModel === 'link') && (
        <LinksView
          config={typeConfig}
          items={filteredItems}
          categories={categories}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          onEdit={handleEdit}
          onDelete={handleDelete}
          handleCreate={handleCreate}
        />
      )}

      {(typeConfig.displayModel === 'list' || typeConfig.displayModel === 'commands') && (
        <CommandsView
          config={typeConfig}
          items={filteredItems}
          search={search}
          setSearch={setSearch}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
          handleCreate={handleCreate}
        />
      )}

      {/* Default fallback */}
      {!['folders', 'cards', 'table', 'links', 'link', 'list', 'commands'].includes(typeConfig.displayModel) && (
        <CardsView
          config={typeConfig}
          items={filteredItems}
          allItems={items}
          categories={categories}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          showFavoritesOnly={showFavoritesOnly}
          setShowFavoritesOnly={setShowFavoritesOnly}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          cardViewMode={cardViewMode}
          setCardViewMode={setCardViewMode}
          sensors={sensors}
          handleDragEnd={handleDragEnd}
          handleCreate={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {isEditing && (
        <EditModal
          config={typeConfig}
          data={editData}
          setData={setEditData}
          onClose={() => {
            setIsEditing(false);
            setHasUnsaved(false);
          }}
          onSave={handleSave}
          setHasUnsaved={setHasUnsaved}
        />
      )}
    </div>
  );
}

// ============================================
// FOLDER VIEW - Full functionality like Notes
// ============================================
function FolderView({
  config,
  items,
  allItems,
  categories,
  selectedItem,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
  viewMode,
  setViewMode,
  editData,
  setEditData,
  isEditing,
  setIsEditing,
  handleSave,
  hasUnsaved,
  setHasUnsaved,
  search,
  setSearch,
  expandedFolders,
  setExpandedFolders,
  showImportExport,
  setShowImportExport,
  handleExportAll,
  handleImport,
  importStatus,
  fileInputRef,
  handleCreate,
  handleCreateFromTemplate,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  allItems: Record<string, unknown>[];
  categories: string[];
  selectedItem: Record<string, unknown> | null;
  onSelect: (item: Record<string, unknown>) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  viewMode: 'view' | 'edit' | 'split';
  setViewMode: (mode: 'view' | 'edit' | 'split') => void;
  editData: Record<string, unknown>;
  setEditData: (data: Record<string, unknown>) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  handleSave: () => void;
  hasUnsaved: boolean;
  setHasUnsaved: (v: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
  expandedFolders: Set<string>;
  setExpandedFolders: (s: Set<string>) => void;
  showImportExport: boolean;
  setShowImportExport: (v: boolean) => void;
  handleExportAll: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importStatus: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleCreate: () => void;
  handleCreateFromTemplate: (t: { name: string; category: string; content: string }) => void;
  handleCreateInFolder: (folderPath: string) => void;
  handleCreateFolder: (folderName: string) => void;
  handleRenameFolder: (oldPath: string, newPath: string) => void;
  handleRenameItem: (itemId: string, newTitle: string) => void;
}) {
  const categoryField = config.categoryField || 'category';

  // State for new folder input
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // State for renaming
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renamingFolderValue, setRenamingFolderValue] = useState('');
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renamingItemValue, setRenamingItemValue] = useState('');

  // Build folder tree
  const tree = useMemo(() => {
    const treeObj: Record<string, Record<string, Record<string, unknown>[]>> = {};

    items.forEach(item => {
      const category = String(item[categoryField] || 'Uncategorized');
      const parts = category.split('/');
      const root = parts[0] || 'Uncategorized';
      const sub = parts.slice(1).join('/') || '_root';

      if (!treeObj[root]) treeObj[root] = {};
      if (!treeObj[root][sub]) treeObj[root][sub] = [];
      treeObj[root][sub].push(item);
    });

    return treeObj;
  }, [items, categoryField]);

  const toggleFolder = (folder: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folder)) {
      next.delete(folder);
    } else {
      next.add(folder);
    }
    setExpandedFolders(next);
  };

  // Templates
  const templates = [
    { name: 'Blank Note', category: 'General', content: '# New Item\n\nStart writing here...' },
    { name: 'Meeting Notes', category: 'Work', content: '# Meeting\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n- \n\n## Notes\n\n- \n\n## Action Items\n\n- [ ] ' },
    { name: 'Research', category: 'Research', content: '# Research Topic\n\n## Overview\n\n## Key Points\n\n- \n\n## References\n\n- ' },
  ];

  // Handler for creating folder
  const onCreateFolder = () => {
    if (!newFolderName.trim()) return;
    handleCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  // Handler for renaming folder
  const onRenameFolder = (oldPath: string) => {
    if (!renamingFolderValue.trim()) return;
    handleRenameFolder(oldPath, renamingFolderValue.trim());
    setRenamingFolder(null);
    setRenamingFolderValue('');
  };

  // Handler for renaming item
  const onRenameItem = (itemId: string) => {
    if (!renamingItemValue.trim()) return;
    handleRenameItem(itemId, renamingItemValue.trim());
    setRenamingItem(null);
    setRenamingItemValue('');
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Sidebar */}
      <div className="flex w-72 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="border-b border-zinc-800 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">{config.name}</h2>
            <div className="flex items-center gap-1">
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
              <button
                onClick={() => setShowNewFolder(true)}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500"
                title="New Item"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleCreateFromTemplate(templates[0])}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New from Template"
              >
                <LayoutTemplate className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="mb-3 rounded-lg bg-zinc-800/50 p-3">
              <div className="text-xs font-medium text-zinc-400 mb-2">Create New Folder</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Folder name (e.g., Work/Projects)"
                  className="flex-1 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onCreateFolder();
                    if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                  }}
                  autoFocus
                />
                <button
                  onClick={onCreateFolder}
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
                Use / for subfolders: e.g., "Work/Projects"
              </div>
            </div>
          )}

          {/* Import/Export Panel */}
          {showImportExport && (
            <div className="mb-3 rounded-lg bg-zinc-800/50 p-3 space-y-2">
              <div className="text-xs font-medium text-zinc-400 mb-2">Obsidian Sync</div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportAll}
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
                    onChange={handleImport}
                  />
                </label>
              </div>
              {importStatus && (
                <div className="text-xs text-center text-zinc-400 py-1">{importStatus}</div>
              )}
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
                        if (e.key === 'Enter') onRenameFolder(rootCategory);
                        if (e.key === 'Escape') { setRenamingFolder(null); setRenamingFolderValue(''); }
                      }}
                      onBlur={() => onRenameFolder(rootCategory)}
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
                  onClick={(e) => { e.stopPropagation(); handleCreateInFolder(rootCategory); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-emerald-400 hover:bg-emerald-500/20 transition-opacity"
                  title="Add item to this folder"
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
                                if (e.key === 'Enter') onRenameFolder(`${rootCategory}/${subCategory}`);
                                if (e.key === 'Escape') { setRenamingFolder(null); setRenamingFolderValue(''); }
                              }}
                              onBlur={() => onRenameFolder(`${rootCategory}/${subCategory}`)}
                              className="bg-zinc-700 px-1 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="flex-1">{subCategory}</span>
                              <button
                                onClick={() => handleCreateInFolder(`${rootCategory}/${subCategory}`)}
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-emerald-400 hover:bg-emerald-500/20 transition-opacity"
                                title="Add item to this subfolder"
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
                          key={String(item.id)}
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
                                if (e.key === 'Enter') onRenameItem(String(item.id));
                                if (e.key === 'Escape') { setRenamingItem(null); setRenamingItemValue(''); }
                              }}
                              onBlur={() => onRenameItem(String(item.id))}
                              className="bg-zinc-700 px-1 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="truncate flex-1 cursor-pointer" onClick={() => onSelect(item)}>{String(item['title'] || 'Untitled')}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setRenamingItem(String(item.id)); setRenamingItemValue(String(item['title'] || 'Untitled')); }}
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-zinc-400 hover:bg-zinc-700 transition-opacity"
                                title="Rename item"
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
            <div className="py-8 text-center text-sm text-zinc-500">No items found</div>
          )}
        </div>

        {/* Quick category select */}
        <div className="border-t border-zinc-800 p-2">
          <select
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value=""
            onChange={(e) => {
              if (e.target.value && selectedItem) {
                setEditData({ ...selectedItem, category: e.target.value });
                setHasUnsaved(true);
              }
            }}
          >
            <option value="">Quick set category...</option>
            {[...DEFAULT_CATEGORIES, ...categories].map(cat => (
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
                  value={String(editData['title'] || selectedItem['title'] || '')}
                  onChange={(e) => {
                    setEditData({ ...editData, title: e.target.value });
                    setHasUnsaved(true);
                  }}
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
                <div className="flex rounded-lg bg-zinc-800 p-0.5">
                  <button onClick={() => setViewMode('edit')} className={cn("rounded-md px-2 py-1 text-xs font-medium", viewMode === 'edit' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setViewMode('split')} className={cn("rounded-md px-2 py-1 text-xs font-medium", viewMode === 'split' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
                    <Columns className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setViewMode('view')} className={cn("rounded-md px-2 py-1 text-xs font-medium", viewMode === 'view' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button onClick={() => onCopy(String(selectedItem['content'] || ''), String(selectedItem.id))} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
                  {copiedId === selectedItem.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>

                <button onClick={handleSave} disabled={!hasUnsaved} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", hasUnsaved ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-zinc-800 text-zinc-500 cursor-not-allowed")}>
                  Save
                </button>

                <button onClick={() => onDelete(String(selectedItem.id))} className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Category & Tags Bar */}
            <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Category:</span>
                <input
                  value={String(editData['category'] || selectedItem['category'] || '')}
                  onChange={(e) => { setEditData({ ...editData, category: e.target.value }); setHasUnsaved(true); }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g., Web/XSS"
                  list="categories"
                />
                <datalist id="categories">
                  {[...DEFAULT_CATEGORIES, ...categories].map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-zinc-500">Tags:</span>
                <input
                  value={Array.isArray(editData['tags']) ? (editData['tags'] as string[]).join(', ') : Array.isArray(selectedItem['tags']) ? (selectedItem['tags'] as string[]).join(', ') : ''}
                  onChange={(e) => { setEditData({ ...editData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }); setHasUnsaved(true); }}
                  className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="tag1, tag2..."
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
                    <span>{String(editData['content'] || selectedItem['content'] || '').length} chars</span>
                  </div>
                  <textarea
                    value={String(editData['content'] || selectedItem['content'] || '')}
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
                          code({ className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;
                            return !isInline && match ? (
                              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>{children}</code>
                            );
                          }
                        }}
                      >
                        {String(editData['content'] || selectedItem['content'] || '')}
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
              <button onClick={handleCreate} className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600">
                <Plus className="h-4 w-4" /> Blank Item
              </button>
              <button onClick={() => handleCreateFromTemplate(templates[0])} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                <LayoutTemplate className="h-4 w-4" /> From Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CARDS VIEW - Full functionality like Prompts
// ============================================
function SortableCard({
  item,
  config,
  isFavorite,
  isCopied,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTagClick,
  viewMode,
}: {
  item: Record<string, unknown>;
  config: ContentTypeConfig;
  isFavorite: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onTagClick: (tag: string) => void;
  viewMode: 'grid' | 'list' | 'table';
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(item.id) });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const contentField = config.fields.find(f => f.name === 'content')?.name || 'content';
  const categoryField = config.categoryField || 'category';

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "group relative rounded-xl border bg-zinc-900 transition-all hover:border-zinc-600",
      isFavorite ? "border-amber-500/30" : "border-zinc-800",
      isDragging && "opacity-50 scale-105 z-50"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity touch-none">
            <div className="h-4 w-4 flex flex-col gap-0.5"><div className="h-0.5 w-full bg-current rounded" /><div className="h-0.5 w-full bg-current rounded" /></div>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button onClick={onToggleFavorite} className="shrink-0 text-zinc-600 hover:text-amber-400">
                {isFavorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
              </button>
              <h3 className="font-semibold text-zinc-100 truncate">{String(item[titleField] || 'Untitled')}</h3>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="rounded-md border border-zinc-700 px-2 py-0.5 font-medium text-zinc-400">
                {String(item[categoryField] || 'general')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onCopy} className={cn("rounded-lg p-2 transition-colors", isCopied ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400")}>
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={onEdit} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400">
              <Edit2 className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 cursor-pointer rounded-lg bg-zinc-950 p-3 text-sm text-zinc-300 font-mono overflow-hidden" onClick={onCopy}>
          <pre className={cn("whitespace-pre-wrap break-words", viewMode === 'grid' ? "line-clamp-4" : "line-clamp-3")}>
            {String(item[contentField] || '').substring(0, 300)}
          </pre>
        </div>

        {Array.isArray(item['tags']) && (item['tags'] as string[]).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(item['tags'] as string[]).map((tag: string) => (
              <span key={tag} onClick={() => onTagClick(tag)} className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-700">
                <Tag className="h-2.5 w-2.5" />{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardsView({
  config,
  items,
  allItems,
  categories,
  favorites,
  toggleFavorite,
  showFavoritesOnly,
  setShowFavoritesOnly,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
  search,
  setSearch,
  filter,
  setFilter,
  cardViewMode,
  setCardViewMode,
  sensors,
  handleDragEnd,
  handleCreate,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  allItems: Record<string, unknown>[];
  categories: string[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (v: boolean) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  search: string;
  setSearch: (s: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  cardViewMode: 'grid' | 'list' | 'table';
  setCardViewMode: (m: 'grid' | 'list' | 'table') => void;
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (e: DragEndEvent) => void;
  handleCreate: () => void;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const contentField = config.fields.find(f => f.name === 'content')?.name || 'content';
  const categoryField = config.categoryField || 'category';

  return (
    <>
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100">
          <option value="all">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", showFavoritesOnly ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-zinc-700 bg-zinc-800 text-zinc-400")}>
          <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-amber-400")} /> Favorites
        </button>

        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
          <button onClick={() => setCardViewMode('table')} className={cn("rounded-md p-1.5", cardViewMode === 'table' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
            <Table2 className="h-4 w-4" />
          </button>
          <button onClick={() => setCardViewMode('list')} className={cn("rounded-md p-1.5", cardViewMode === 'list' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setCardViewMode('grid')} className={cn("rounded-md p-1.5", cardViewMode === 'grid' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={cn("rounded-full px-3 py-1 text-xs font-medium border", filter === 'all' ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 text-zinc-400")}>
          All ({allItems.length})
        </button>
        {categories.map(cat => {
          const count = allItems.filter(i => String(i[categoryField] || '') === cat).length;
          if (count === 0) return null;
          return (
            <button key={cat} onClick={() => setFilter(cat)} className={cn("rounded-full px-3 py-1 text-xs font-medium border", filter === cat ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 text-zinc-400")}>
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => String(i.id))} strategy={verticalListSortingStrategy}>
          <div className={cn(cardViewMode === 'grid' ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3")}>
            {items.map((item) => (
              <SortableCard
                key={String(item.id)}
                item={item}
                config={config}
                isFavorite={favorites.has(String(item.id))}
                isCopied={copiedId === item.id}
                onCopy={() => onCopy(String(item[contentField] || ''), String(item.id))}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(String(item.id))}
                onToggleFavorite={() => toggleFavorite(String(item.id))}
                onTagClick={(tag) => setSearch(tag)}
                viewMode={cardViewMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Search className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No items found</p>
          <button onClick={handleCreate} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 mx-auto">
            <Plus className="h-4 w-4" /> Create Item
          </button>
        </div>
      )}
    </>
  );
}

// ============================================
// TABLE VIEW
// ============================================
function TableView({
  config,
  items,
  search,
  setSearch,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
  handleCreate,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  search: string;
  setSearch: (s: string) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  handleCreate: () => void;
}) {
  const displayFields = config.fields.slice(0, 5);

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              {displayFields.map(field => (
                <th key={field.name} className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase">{field.label}</th>
              ))}
              <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={String(item.id)} className="group border-b border-zinc-800 hover:bg-zinc-800/50">
                {displayFields.map(field => (
                  <td key={field.name} className="py-2 px-3 text-zinc-300">
                    {field.type === 'tags' && Array.isArray(item[field.name]) ? (
                      <div className="flex gap-1">
                        {(item[field.name] as string[]).slice(0, 2).map(t => (
                          <span key={t} className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs">{t}</span>
                        ))}
                        {(item[field.name] as string[]).length > 2 && <span className="text-xs text-zinc-500">+{(item[field.name] as string[]).length - 2}</span>}
                      </div>
                    ) : (
                      <span className="truncate max-w-[200px] block">{String(item[field.name] || '-')}</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="rounded p-1.5 text-zinc-500 hover:text-blue-400"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onDelete(String(item.id))} className="rounded p-1.5 text-zinc-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-zinc-400">No items</p>
          <button onClick={handleCreate} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 mx-auto">
            <Plus className="h-4 w-4" /> Create Item
          </button>
        </div>
      )}
    </>
  );
}

// ============================================
// LINKS VIEW
// ============================================
function LinksView({
  config,
  items,
  categories,
  search,
  setSearch,
  filter,
  setFilter,
  onEdit,
  onDelete,
  handleCreate,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  categories: string[];
  search: string;
  setSearch: (s: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  handleCreate: () => void;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const urlField = config.fields.find(f => f.type === 'url')?.name || 'url';
  const categoryField = config.categoryField || 'category';

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, unknown>[]> = {};
    items.forEach(item => {
      const cat = String(item[categoryField] || 'Other');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items, categoryField]);

  return (
    <>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Search..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100">
          <option value="all">All</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase">{cat} ({catItems.length})</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catItems.map(item => (
                <div key={String(item.id)} className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600">
                  <a href={String(item[urlField] || '#')} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-100 truncate group-hover:text-emerald-400">{String(item[titleField] || 'Untitled')}</div>
                    <div className="text-xs text-zinc-500 truncate mt-1">{String(item[urlField] || '')}</div>
                  </a>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={String(item[urlField] || '#')} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-zinc-500 hover:text-zinc-200">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => onEdit(item)} className="rounded p-1.5 text-zinc-500 hover:text-blue-400">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(String(item.id))} className="rounded p-1.5 text-zinc-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-zinc-400">No links</p>
          <button onClick={handleCreate} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 mx-auto">
            <Plus className="h-4 w-4" /> Add Link
          </button>
        </div>
      )}
    </>
  );
}

// ============================================
// COMMANDS VIEW
// ============================================
function CommandsView({
  config,
  items,
  search,
  setSearch,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
  handleCreate,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  search: string;
  setSearch: (s: string) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  handleCreate: () => void;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const commandField = config.fields.find(f => f.name === 'command')?.name || 'command';
  const toolField = config.fields.find(f => f.name === 'tool')?.name || 'tool';

  // Group by tool
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, unknown>[]> = {};
    items.forEach(item => {
      const tool = String(item[toolField] || 'other');
      if (!groups[tool]) groups[tool] = [];
      groups[tool].push(item);
    });
    return groups;
  }, [items, toolField]);

  const toolColors: Record<string, string> = {
    nmap: 'text-blue-400',
    ffuf: 'text-orange-400',
    gobuster: 'text-purple-400',
    sqlmap: 'text-red-400',
    hydra: 'text-yellow-400',
    bash: 'text-green-400',
  };

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <input type="text" placeholder="Search commands..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).sort().map(([tool, toolItems]) => (
          <div key={tool}>
            <h3 className={cn("mb-3 text-sm font-semibold uppercase", toolColors[tool] || 'text-zinc-400')}>
              {tool} ({toolItems.length})
            </h3>
            <div className="space-y-2">
              {toolItems.map(item => (
                <div key={String(item.id)} className="group rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-100">{String(item[titleField] || 'Untitled')}</div>
                      <code className="mt-1 block text-xs text-zinc-500 font-mono truncate">
                        $ {String(item[commandField] || '')}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onCopy(String(item[commandField] || ''), String(item.id))} className={cn("rounded p-1.5", copiedId === item.id ? "text-emerald-400" : "text-zinc-500 hover:text-emerald-400")}>
                        {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button onClick={() => onEdit(item)} className="rounded p-1.5 text-zinc-500 hover:text-blue-400">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete(String(item.id))} className="rounded p-1.5 text-zinc-500 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-zinc-400">No commands</p>
          <button onClick={handleCreate} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 mx-auto">
            <Plus className="h-4 w-4" /> Add Command
          </button>
        </div>
      )}
    </>
  );
}

// ============================================
// EDIT MODAL
// ============================================
function EditModal({
  config,
  data,
  setData,
  onClose,
  onSave,
  setHasUnsaved,
}: {
  config: ContentTypeConfig;
  data: Record<string, unknown>;
  setData: (d: Record<string, unknown>) => void;
  onClose: () => void;
  onSave: () => void;
  setHasUnsaved: (v: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-900">
          <h2 className="text-xl font-bold text-zinc-100">{data.id ? 'Edit' : 'New'} Item</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {config.fields.map(field => (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={String(data[field.name] || '')}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value }); setHasUnsaved(true); }}
                  rows={8}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder={field.placeholder}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(data[field.name] || '')}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value }); setHasUnsaved(true); }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === 'tags' ? (
                <input
                  value={Array.isArray(data[field.name]) ? (data[field.name] as string[]).join(', ') : ''}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }); setHasUnsaved(true); }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="tag1, tag2, tag3"
                />
              ) : (
                <input
                  type={field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'}
                  value={String(data[field.name] || '')}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value }); setHasUnsaved(true); }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4 sticky bottom-0 bg-zinc-900">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100">Cancel</button>
          <button onClick={onSave} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500">Save</button>
        </div>
      </div>
    </div>
  );
}
