/**
 * Dynamic Content Page
 * Universal page for custom content types
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
  Table2,
  LayoutGrid,
  List,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { useData } from '../lib/DataContext';
import { ContentTypeConfig, DisplayModel, generateContentId } from '../lib/contentTypes';
import { cn } from '../utils/cn';

// Simple markdown renderer for content
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-xl font-bold text-zinc-100 mt-4 mb-2">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-semibold text-zinc-200 mt-3 mb-1">{line.slice(3)}</h2>;
        }
        if (line.startsWith('```')) {
          return null; // Skip code fence markers
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="text-zinc-300 ml-4">{line.slice(2)}</li>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} className="text-zinc-300">{line}</p>;
      })}
    </div>
  );
}

export function DynamicContent() {
  const { typeId } = useParams<{ typeId: string }>();
  const { data, contentTypes } = useData();

  // Find the content type config
  const typeConfig = data.contentTypes.find(t => t.id === typeId);

  if (!typeConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-zinc-500">
        <FileText className="mb-4 h-16 w-16 text-zinc-700" />
        <p className="text-lg font-medium">Content type not found</p>
        <p className="mt-1 text-sm">Type ID: {typeId}</p>
      </div>
    );
  }

  // Get items for this content type (from localStorage or empty array)
  const [items, setItems] = useState<Record<string, unknown>[]>(() => {
    const saved = localStorage.getItem(`content-${typeId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'split'>('split');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save items to localStorage
  const saveItems = (newItems: Record<string, unknown>[]) => {
    setItems(newItems);
    localStorage.setItem(`content-${typeId}`, JSON.stringify(newItems));
  };

  // Create new item
  const handleCreate = () => {
    const newItem: Record<string, unknown> = {
      id: generateContentId(),
      contentTypeId: typeId,
      updatedAt: new Date().toISOString(),
    };

    // Initialize with default values from fields
    typeConfig.fields.forEach(field => {
      if (field.default) {
        newItem[field.name] = field.default;
      } else if (field.type === 'tags') {
        newItem[field.name] = [];
      } else {
        newItem[field.name] = '';
      }
    });

    setEditData(newItem);
    setIsEditing(true);
    setSelectedItem(null);
  };

  // Edit item
  const handleEdit = (item: Record<string, unknown>) => {
    setEditData({ ...item });
    setIsEditing(true);
    setSelectedItem(item);
  };

  // Save item
  const handleSave = () => {
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

    setIsEditing(false);
    setSelectedItem(editData);
    setEditData({});
  };

  // Delete item
  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      saveItems(items.filter(i => i.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  // Copy field value
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter(item => {
      return typeConfig.fields.some(field => {
        const value = item[field.name];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(search.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(v => String(v).toLowerCase().includes(search.toLowerCase()));
        }
        return false;
      });
    });
  }, [items, search, typeConfig.fields]);

  // Render based on display model
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{typeConfig.name}</h1>
          <p className="text-sm text-zinc-500">
            {items.length} items • {typeConfig.displayModel} view
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

      {/* Search */}
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

      {/* Content based on display model */}
      {typeConfig.displayModel === 'folders' && (
        <FolderView
          config={typeConfig}
          items={filteredItems}
          selectedItem={selectedItem}
          onSelect={setSelectedItem}
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
        />
      )}

      {typeConfig.displayModel === 'cards' && (
        <CardsView
          config={typeConfig}
          items={filteredItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
        />
      )}

      {typeConfig.displayModel === 'table' && (
        <TableView
          config={typeConfig}
          items={filteredItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
        />
      )}

      {typeConfig.displayModel === 'links' && (
        <LinksView
          config={typeConfig}
          items={filteredItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {typeConfig.displayModel === 'list' && (
        <ListView
          config={typeConfig}
          items={filteredItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
        />
      )}

      {/* Default fallback view */}
      {!['folders', 'cards', 'table', 'links', 'list'].includes(typeConfig.displayModel) && (
        <CardsView
          config={typeConfig}
          items={filteredItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          copiedId={copiedId}
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
            setEditData({});
          }}
          onSave={handleSave}
        />
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && !isEditing && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <FileText className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No items yet</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first item to get started</p>
          <button
            onClick={handleCreate}
            className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Item
          </button>
        </div>
      )}
    </div>
  );
}

// Folder View Component
function FolderView({
  config,
  items,
  selectedItem,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
  viewMode,
  setViewMode,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  selectedItem: Record<string, unknown> | null;
  onSelect: (item: Record<string, unknown>) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  viewMode: string;
  setViewMode: (mode: 'view' | 'edit' | 'split') => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const categoryField = config.categoryField || 'category';

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

  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const contentField = config.fields.find(f => f.name === 'content')?.name || 'content';

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Sidebar */}
      <div className="w-72 rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <div className="p-3 border-b border-zinc-800">
          <h3 className="font-medium text-zinc-300 text-sm">Folders</h3>
        </div>
        <div className="overflow-y-auto p-2">
          {Object.entries(tree).sort().map(([rootCategory, subCategories]) => (
            <div key={rootCategory} className="mb-1">
              <button
                onClick={() => toggleFolder(rootCategory)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
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
                <span>{rootCategory}</span>
                <span className="ml-auto text-xs text-zinc-600">
                  {Object.values(subCategories).flat().length}
                </span>
              </button>

              {expandedFolders.has(rootCategory) && (
                <div className="ml-3 border-l border-zinc-800 pl-2">
                  {Object.entries(subCategories).sort().map(([subCategory, categoryItems]) => (
                    <div key={subCategory} className="mt-1">
                      {subCategory !== '_root' && (
                        <div className="px-2 py-1 text-xs font-medium text-zinc-500">
                          {subCategory}
                        </div>
                      )}
                      {categoryItems.map(item => (
                        <button
                          key={String(item.id)}
                          onClick={() => onSelect(item)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                            selectedItem?.id === item.id
                              ? "bg-emerald-600/20 text-emerald-400"
                              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{String(item[titleField] || 'Untitled')}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        {selectedItem ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-xl font-bold text-zinc-100">
                {String(selectedItem[titleField] || 'Untitled')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(selectedItem)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-blue-400"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(String(selectedItem.id))}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SimpleMarkdown content={String(selectedItem[contentField] || '')} />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <FileText className="mb-4 h-16 w-16 text-zinc-700" />
            <p className="text-lg font-medium">Select an item</p>
            <p className="mt-1 text-sm">Choose from the folder tree</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Cards View
function CardsView({
  config,
  items,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const contentField = config.fields.find(f => f.name === 'content')?.name || 'content';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={String(item.id)}
          className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-all"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-zinc-100 truncate">
              {String(item[titleField] || 'Untitled')}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(item)}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(String(item.id))}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div
            className="cursor-pointer rounded-lg bg-zinc-950 p-3 text-sm text-zinc-300 font-mono line-clamp-3"
            onClick={() => onCopy(String(item[contentField] || ''), String(item.id))}
          >
            {copiedId === item.id ? (
              <span className="text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4" /> Copied!
              </span>
            ) : (
              String(item[contentField] || '').substring(0, 150)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Table View
function TableView({
  config,
  items,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const displayFields = config.fields.slice(0, 4);
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-800/50">
            {displayFields.map(field => (
              <th key={field.name} className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase">
                {field.label}
              </th>
            ))}
            <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={String(item.id)} className="border-b border-zinc-800 hover:bg-zinc-800/50">
              {displayFields.map(field => (
                <td key={field.name} className="py-2 px-3 text-zinc-300">
                  {field.type === 'tags' && Array.isArray(item[field.name]) ? (
                    <div className="flex gap-1">
                      {(item[field.name] as string[]).slice(0, 2).map(t => (
                        <span key={t} className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs">{t}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="truncate max-w-[200px] block">{String(item[field.name] || '-')}</span>
                  )}
                </td>
              ))}
              <td className="py-2 px-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(item)} className="rounded p-1 text-zinc-500 hover:text-blue-400">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(String(item.id))} className="rounded p-1 text-zinc-500 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Links View
function LinksView({
  config,
  items,
  onEdit,
  onDelete,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const urlField = config.fields.find(f => f.type === 'url')?.name || 'url';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <a
          key={String(item.id)}
          href={String(item[urlField] || '#')}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-all"
        >
          <LinkIcon className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-100 truncate group-hover:text-emerald-400">
              {String(item[titleField] || 'Untitled')}
            </div>
            <div className="text-xs text-zinc-500 truncate mt-1">
              {String(item[urlField] || '')}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  );
}

// List View
function ListView({
  config,
  items,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
}: {
  config: ContentTypeConfig;
  items: Record<string, unknown>[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const titleField = config.fields.find(f => f.name === 'title')?.name || 'title';
  const commandField = config.fields.find(f => f.name === 'command')?.name || 'command';

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={String(item.id)}
          className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-100">{String(item[titleField] || 'Untitled')}</div>
            {item[commandField] && (
              <code className="text-xs text-zinc-500 font-mono">{String(item[commandField]).substring(0, 60)}...</code>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(String(item[commandField] || ''), String(item.id))}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400"
            >
              {copiedId === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => onEdit(item)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-blue-400">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(String(item.id))} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Edit Modal
function EditModal({
  config,
  data,
  setData,
  onClose,
  onSave,
}: {
  config: ContentTypeConfig;
  data: Record<string, unknown>;
  setData: (data: Record<string, unknown>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-xl font-bold text-zinc-100">
            {data.id ? 'Edit Item' : 'New Item'}
          </h2>
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
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                  rows={6}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder={field.placeholder}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(data[field.name] || '')}
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'tags' ? (
                <input
                  value={Array.isArray(data[field.name]) ? (data[field.name] as string[]).join(', ') : ''}
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="tag1, tag2, tag3"
                />
              ) : (
                <input
                  type={field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'}
                  value={String(data[field.name] || '')}
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100">
            Cancel
          </button>
          <button onClick={onSave} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
