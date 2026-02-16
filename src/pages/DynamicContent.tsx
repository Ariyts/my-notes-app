/**
 * Dynamic Content Page
 * Universal page for custom content types with full functionality
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Copy,
  Edit2,
  Trash2,
  Check,
  FileText,
  Star,
  StarOff,
  Grid,
  List,
  Table2,
  ExternalLink,
  Tag,
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
} from '../lib/obsidianSync';
import { cn } from '../utils/cn';
import { FolderView, FolderItem } from '../components/shared/FolderView';

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
  const { data } = useData();

  // Find the content type config
  const typeConfig = data.contentTypes.find(t => t.id === typeId);

  // Load items from localStorage
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  // Favorites (for cards model)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Folder view state (for folders display model)
  const [selectedFolderItem, setSelectedFolderItem] = useState<FolderItem | null>(null);
  const [editFolderData, setEditFolderData] = useState<FolderItem>({
    id: '',
    title: '',
    category: '',
    content: '',
    tags: [],
  });
  const [hasUnsavedFolder, setHasUnsavedFolder] = useState(false);

  // Other view states
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    setSelectedFolderItem(null);
    setIsEditing(false);
    setEditData({});
    setHasUnsaved(false);
    setHasUnsavedFolder(false);
    setShowFavoritesOnly(false);
  }, [typeId]);

  if (!typeConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-zinc-500">
        <FileText className="mb-4 h-16 w-16 text-zinc-700" />
        <p className="text-lg font-medium">Content type not found</p>
        <p className="mt-1 text-sm">Type ID: {typeId}</p>
      </div>
    );
  }

  // Save items to localStorage
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

  // Convert items to FolderItems for FolderView
  const toFolderItems = (items: Record<string, unknown>[]): FolderItem[] => {
    return items.map(item => ({
      id: String(item.id || ''),
      title: String(item['title'] || 'Untitled'),
      category: String(item['category'] || 'General'),
      content: String(item['content'] || ''),
      tags: Array.isArray(item['tags']) ? item['tags'] as string[] : [],
      updatedAt: String(item['updatedAt'] || new Date().toISOString()),
      ...item,
    }));
  };

  // =============================================
  // FOLDER VIEW HANDLERS (for folders display model)
  // =============================================
  
  const handleFolderSelect = (item: FolderItem) => {
    if (hasUnsavedFolder && !confirm('Discard unsaved changes?')) return;
    setSelectedFolderItem(item);
    setEditFolderData({ ...item });
    setHasUnsavedFolder(false);
  };

  const handleFolderCreate = (category?: string) => {
    const newItem: Record<string, unknown> = {
      id: generateContentId(),
      contentTypeId: typeId,
      updatedAt: new Date().toISOString(),
      title: 'Untitled',
      category: category || 'General',
      content: `# New Item\n\nStart writing here...\n\n## Section\n\n- Point 1\n- Point 2`,
      tags: [],
    };

    typeConfig.fields.forEach(field => {
      if (!newItem[field.name] && field.default) {
        newItem[field.name] = field.default;
      }
    });

    saveItems([...items, newItem]);
    
    const folderItem: FolderItem = toFolderItems([newItem])[0];
    setSelectedFolderItem(folderItem);
    setEditFolderData(folderItem);
    setHasUnsavedFolder(false);
  };

  const handleFolderCreateFolder = (folderName: string) => {
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
    
    const folderItem: FolderItem = toFolderItems([newItem])[0];
    setSelectedFolderItem(folderItem);
    setEditFolderData(folderItem);
    setHasUnsavedFolder(false);
  };

  const handleFolderUpdate = (id: string, data: Partial<FolderItem>) => {
    const newItems = items.map(item => {
      if (String(item.id) === id) {
        return { ...item, ...data, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    saveItems(newItems);
    
    // Update selected item state
    if (selectedFolderItem?.id === id) {
      setSelectedFolderItem(prev => prev ? { ...prev, ...data } : null);
      setEditFolderData(prev => ({ ...prev, ...data }));
    }
  };

  const handleFolderDelete = (id: string) => {
    saveItems(items.filter(item => String(item.id) !== id));
    if (selectedFolderItem?.id === id) {
      const remainingItems = items.filter(item => String(item.id) !== id);
      if (remainingItems.length > 0) {
        const nextItem = toFolderItems(remainingItems)[0];
        setSelectedFolderItem(nextItem);
        setEditFolderData(nextItem);
      } else {
        setSelectedFolderItem(null);
      }
    }
  };

  // Atomic folder rename - updates all items in folder at once
  const handleFolderRename = (oldPath: string, newPath: string) => {
    const newItems = items.map(item => {
      const category = String(item.category || 'General');
      if (category === oldPath) {
        return { ...item, category: newPath, updatedAt: new Date().toISOString() };
      } else if (category.startsWith(oldPath + '/')) {
        return { ...item, category: category.replace(oldPath + '/', newPath + '/'), updatedAt: new Date().toISOString() };
      }
      return item;
    });
    saveItems(newItems);

    // Update selected item state if it was in renamed folder
    if (selectedFolderItem) {
      const selCat = selectedFolderItem.category;
      if (selCat === oldPath) {
        setSelectedFolderItem(prev => prev ? { ...prev, category: newPath } : null);
        setEditFolderData(prev => ({ ...prev, category: newPath }));
      } else if (selCat.startsWith(oldPath + '/')) {
        const newCat = selCat.replace(oldPath + '/', newPath + '/');
        setSelectedFolderItem(prev => prev ? { ...prev, category: newCat } : null);
        setEditFolderData(prev => ({ ...prev, category: newCat }));
      }
    }
  };

  // Delete folder with all its contents
  const handleDeleteFolder = (folderPath: string) => {
    const newItems = items.filter(item => {
      const category = String(item.category || 'General');
      return category !== folderPath && !category.startsWith(folderPath + '/');
    });
    saveItems(newItems);

    // Clear selection if deleted folder contained selected item
    if (selectedFolderItem) {
      const selCat = selectedFolderItem.category;
      if (selCat === folderPath || selCat.startsWith(folderPath + '/')) {
        const remainingItems = newItems;
        if (remainingItems.length > 0) {
          const nextItem = toFolderItems(remainingItems)[0];
          setSelectedFolderItem(nextItem);
          setEditFolderData(nextItem);
        } else {
          setSelectedFolderItem(null);
        }
      }
    }
  };

  const handleFolderExportAll = async () => {
    const folderItems = toFolderItems(items);
    const blob = await createNotesArchive(folderItems);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typeConfig.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFolderImport = async (files: FileList) => {
    try {
      let imported: Partial<{ title: string; content: string; category: string; tags: string[] }>[] = [];

      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        imported = await importNotesFromZip(files[0]);
      } else {
        imported = await importNotesFromFiles(files);
      }

      const newItems = [...items];
      for (const item of imported) {
        if (item.title && item.content) {
          newItems.push({
            id: generateContentId(),
            contentTypeId: typeId,
            updatedAt: new Date().toISOString(),
            title: item.title,
            content: item.content,
            category: item.category || 'Imported',
            tags: item.tags || [],
          });
        }
      }
      saveItems(newItems);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  // =============================================
  // OTHER VIEW HANDLERS (cards, table, links, commands)
  // =============================================

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

    setEditData(newItem);
    setIsEditing(true);
    setSelectedItem(null);
    setHasUnsaved(false);
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

  // Render based on display model
  if (typeConfig.displayModel === 'folders') {
    const folderItems = toFolderItems(items);
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{typeConfig.name}</h1>
            <p className="text-sm text-zinc-500">
              {items.length} items
              {!typeConfig.isDefault && <span className="ml-2 text-amber-400">(custom)</span>}
            </p>
          </div>
        </div>

        <FolderView
          items={folderItems}
          categories={categories}
          selectedItem={selectedFolderItem}
          onSelect={handleFolderSelect}
          onCreate={handleFolderCreate}
          onCreateFolder={handleFolderCreateFolder}
          onUpdate={handleFolderUpdate}
          onDelete={handleFolderDelete}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleFolderRename}
          onExportAll={handleFolderExportAll}
          onImport={handleFolderImport}
          title={typeConfig.name}
          predefinedCategories={allCategories}
          editData={editFolderData}
          setEditData={setEditFolderData}
          hasUnsaved={hasUnsavedFolder}
          setHasUnsaved={setHasUnsavedFolder}
        />
      </div>
    );
  }

  // Cards, Table, Links, Commands views remain the same
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
          New Item
        </button>
      </div>

      {/* Cards View */}
      {typeConfig.displayModel === 'cards' && (
        <CardsView
          config={typeConfig}
          items={filteredItems}
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

      {/* Table View */}
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

      {/* Links View */}
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

      {/* Commands View */}
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

      {/* Default fallback - Cards View */}
      {!['folders', 'cards', 'table', 'links', 'link', 'list', 'commands'].includes(typeConfig.displayModel) && (
        <CardsView
          config={typeConfig}
          items={filteredItems}
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
// CARDS VIEW
// ============================================
function CardsView({
  config,
  items,
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
  setFilter: (s: string) => void;
  cardViewMode: 'grid' | 'list' | 'table';
  setCardViewMode: (v: 'grid' | 'list' | 'table') => void;
  sensors: any;
  handleDragEnd: (e: DragEndEvent) => void;
  handleCreate: () => void;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const contentField = config.fields.find(f => f.name === 'content')?.name || 'content';
  const categoryField = config.categoryField || 'category';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
        >
          <option value="all">All</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            showFavoritesOnly ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"
          )}
        >
          <Star className="h-4 w-4" />
          Favorites
        </button>

        <div className="flex rounded-lg bg-zinc-800 p-0.5">
          <button onClick={() => setCardViewMode('grid')} className={cn("p-2 rounded", cardViewMode === 'grid' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
            <Grid className="h-4 w-4" />
          </button>
          <button onClick={() => setCardViewMode('list')} className={cn("p-2 rounded", cardViewMode === 'list' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setCardViewMode('table')} className={cn("p-2 rounded", cardViewMode === 'table' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400")}>
            <Table2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Items Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => String(i.id))} strategy={verticalListSortingStrategy}>
          <div className={cn(
            "gap-4",
            cardViewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
          )}>
            {items.map(item => {
              const id = String(item.id);
              const isFavorite = favorites.has(id);
              const isCopied = copiedId === id;
              
              return (
                <div
                  key={id}
                  className={cn(
                    "group rounded-xl border bg-zinc-900 p-4 transition-all hover:border-zinc-600",
                    isFavorite ? "border-amber-500/30" : "border-zinc-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleFavorite(id)} className="shrink-0 text-zinc-600 hover:text-amber-400">
                          {isFavorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
                        </button>
                        <h3 className="font-semibold text-zinc-100 truncate">{String(item[titleField] || 'Untitled')}</h3>
                      </div>
                      <span className="mt-1 inline-block rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                        {String(item[categoryField] || 'general')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onCopy(String(item[contentField] || ''), id)} className={cn("rounded-lg p-2", isCopied ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:bg-zinc-800")}>
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button onClick={() => onEdit(item)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete(id)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-zinc-950 p-3 text-sm text-zinc-300 font-mono overflow-hidden">
                    <pre className="whitespace-pre-wrap break-words line-clamp-4">
                      {String(item[contentField] || '').substring(0, 200)}
                    </pre>
                  </div>

                  {Array.isArray(item['tags']) && (item['tags'] as string[]).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(item['tags'] as string[]).map((tag: string) => (
                        <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="py-12 text-center text-zinc-500">
          <p>No items yet</p>
          <button onClick={handleCreate} className="mt-2 text-emerald-400 hover:underline">
            Create your first item
          </button>
        </div>
      )}
    </div>
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
  const displayFields = config.fields.filter(f => !f.name.startsWith('_')).slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              {displayFields.map(field => (
                <th key={field.name} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  {field.label || field.name}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map(item => (
              <tr key={String(item.id)} className="hover:bg-zinc-800/50">
                {displayFields.map(field => (
                  <td key={field.name} className="px-4 py-3 text-sm text-zinc-300">
                    {field.type === 'tags' && Array.isArray(item[field.name])
                      ? (item[field.name] as string[]).join(', ')
                      : String(item[field.name] || '-').substring(0, 50)
                    }
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="text-zinc-400 hover:text-blue-400">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(String(item.id))} className="text-zinc-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="py-12 text-center text-zinc-500">
            <p>No items yet</p>
            <button onClick={handleCreate} className="mt-2 text-emerald-400 hover:underline">
              Create your first item
            </button>
          </div>
        )}
      </div>
    </div>
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
  setFilter: (s: string) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  handleCreate: () => void;
}) {
  const urlField = config.fields.find(f => f.type === 'url')?.name || 'url';
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
        >
          <option value="all">All</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div
            key={String(item.id)}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-100">{String(item[titleField] || 'Untitled')}</h3>
              <a
                href={String(item[urlField] || '#')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-emerald-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {String(item[urlField] || '')}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(item)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(String(item.id))} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-12 text-center text-zinc-500">
            <p>No links yet</p>
            <button onClick={handleCreate} className="mt-2 text-emerald-400 hover:underline">
              Add your first link
            </button>
          </div>
        )}
      </div>
    </div>
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
  const commandField = config.fields.find(f => f.name === 'command' || f.type === 'textarea')?.name || 'command';
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search commands..."
          className="w-full rounded-lg bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const id = String(item.id);
          const isCopied = copiedId === id;
          
          return (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-zinc-100">{String(item[titleField] || 'Untitled')}</h3>
                <pre className="mt-1 text-sm text-zinc-400 font-mono overflow-x-auto">
                  {String(item[commandField] || '')}
                </pre>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCopy(String(item[commandField] || ''), id)}
                  className={cn("rounded-lg p-2", isCopied ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800")}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(id)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="py-12 text-center text-zinc-500">
            <p>No commands yet</p>
            <button onClick={handleCreate} className="mt-2 text-emerald-400 hover:underline">
              Add your first command
            </button>
          </div>
        )}
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Edit Item</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">✕</button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {config.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                {field.label || field.name}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  value={String(data[field.name] || '')}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value }); setHasUnsaved(true); }}
                  className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[100px]"
                  placeholder={field.placeholder}
                />
              ) : field.type === 'tags' ? (
                <input
                  value={Array.isArray(data[field.name]) ? (data[field.name] as string[]).join(', ') : ''}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }); setHasUnsaved(true); }}
                  className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="tag1, tag2, tag3"
                />
              ) : field.type === 'url' ? (
                <input
                  type="url"
                  value={String(data[field.name] || '')}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value }); setHasUnsaved(true); }}
                  className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="https://..."
                />
              ) : (
                <input
                  type="text"
                  value={String(data[field.name] || '')}
                  onChange={(e) => { setData({ ...data, [field.name]: e.target.value }); setHasUnsaved(true); }}
                  className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-600">
            Cancel
          </button>
          <button onClick={onSave} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
