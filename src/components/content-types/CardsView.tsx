/**
 * Cards View
 * 
 * Displays items as cards with preview, categories, tags, and copy functionality.
 * Used for Prompts and similar content.
 */

import { useState, useMemo } from 'react';
import { 
  Plus, Search, Copy, Tag, Trash2, Check, Grid, List, Table2, 
  Star, StarOff, X, Pencil 
} from 'lucide-react';
import { Section, SectionItem } from '../../types/sections';
import { cn } from '../../utils/cn';

// Default categories with colors
const DEFAULT_CATEGORIES = [
  { value: 'recon', label: 'Recon', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'exploit', label: 'Exploit', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'privesc', label: 'PrivEsc', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'persistence', label: 'Persistence', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'evasion', label: 'Evasion', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { value: 'reporting', label: 'Reporting', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'social', label: 'Social Eng', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
];

type ViewMode = 'grid' | 'list' | 'table';

interface CardsViewProps {
  section: Section;
  items: SectionItem[];
  onItemsChange: (items: SectionItem[]) => void;
}

// Helper components (simplified versions from original Prompts.tsx)
function CopyButton({ onCopy, isCopied, title = "Copy" }: { onCopy: () => void; isCopied: boolean; title?: string }) {
  return (
    <button
      onClick={onCopy}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
        isCopied
          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
          : "border-zinc-600 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400"
      )}
    >
      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {isCopied ? 'Copied!' : title}
    </button>
  );
}

function InlineEdit({ value, onSave, onCancel, placeholder = "Enter text..." }: {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  return (
    <div className="flex items-center gap-1">
      <input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSave(editValue.trim() || value); }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 rounded bg-zinc-700 px-2 py-0.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        autoFocus
      />
      <button onClick={() => onSave(editValue.trim() || value)} className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500 shrink-0">
        <Check className="h-3 w-3" />
      </button>
      <button onClick={onCancel} className="rounded bg-zinc-700 p-1 text-zinc-300 hover:bg-zinc-600 shrink-0">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Card component
function CardItem({ 
  item, 
  isFavorite,
  isCopied,
  onCopy, 
  onUpdate, 
  onDelete, 
  onToggleFavorite,
  categories,
  copyField,
  viewMode,
}: {
  item: SectionItem;
  isFavorite: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onUpdate: (data: Partial<SectionItem['data']>, tags?: string[]) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  categories: typeof DEFAULT_CATEGORIES;
  copyField: string;
  viewMode: 'grid' | 'list';
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const title = String(item.data.title || 'Untitled');
  const content = String(item.data.content || '');
  const category = String(item.data.category || 'other');

  const getCategoryStyle = (cat: string) => {
    return categories.find(c => c.value === cat)?.color || categories[categories.length - 1].color;
  };

  return (
    <div className={cn(
      "group relative rounded-xl border bg-zinc-900 transition-all hover:border-zinc-600",
      isFavorite ? "border-amber-500/30" : "border-zinc-800"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button onClick={onToggleFavorite} className="shrink-0 text-zinc-600 hover:text-amber-400">
                {isFavorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
              </button>
              {isRenaming ? (
                <InlineEdit
                  value={title}
                  onSave={(newTitle) => { onUpdate({ title: newTitle }); setIsRenaming(false); }}
                  onCancel={() => setIsRenaming(false)}
                  placeholder="Title..."
                />
              ) : (
                <h3 
                  className="font-semibold text-zinc-100 cursor-pointer hover:text-emerald-400 transition-colors truncate"
                  onClick={() => {}} // Open edit modal
                  title={title}
                >
                  {title}
                </h3>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={cn("rounded-md border px-2 py-0.5 font-medium", getCategoryStyle(category))}>
                {categories.find(c => c.value === category)?.label || category}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {isDeleting ? (
              <div className="flex items-center gap-1">
                <button onClick={onDelete} className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-500">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setIsDeleting(false)} className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setIsRenaming(true)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400 opacity-0 group-hover:opacity-100" title="Rename">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setIsDeleting(true)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 opacity-0 group-hover:opacity-100" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Content with Copy */}
        <div className="mt-3">
          <div className="rounded-lg bg-zinc-950 p-3 text-sm text-zinc-300 font-mono overflow-hidden">
            <pre className={cn("whitespace-pre-wrap break-words", viewMode === 'grid' ? "line-clamp-4" : "line-clamp-3")}>{content}</pre>
          </div>
          <div className="mt-2 flex justify-end">
            <CopyButton onCopy={onCopy} isCopied={isCopied} />
          </div>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {item.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-700">
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main CardsView component
export function CardsView({ section, items, onItemsChange }: CardsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`favorites_${section.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Get categories from section config or use defaults
  const categories = section.config?.categories 
    ? section.config.categories.map((cat, idx) => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        color: DEFAULT_CATEGORIES[idx % DEFAULT_CATEGORIES.length]?.color || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1].color,
      }))
    : DEFAULT_CATEGORIES;

  const copyField = section.config?.copyField || 'content';

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.tags.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const title = String(item.data.title || '');
      const content = String(item.data.content || '');
      const category = String(item.data.category || '');
      
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) || 
                           content.toLowerCase().includes(search.toLowerCase()) ||
                           item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = filter === 'all' || category === filter;
      const matchesFavorites = !showFavoritesOnly || favorites.has(item.id);
      return matchesSearch && matchesCategory && matchesFavorites;
    }).sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [items, search, filter, showFavoritesOnly, favorites]);

  // Handlers
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleUpdate = (id: string, data: Partial<SectionItem['data']>, tags?: string[]) => {
    onItemsChange(items.map(item => 
      item.id === id 
        ? { ...item, data: { ...item.data, ...data }, tags: tags ?? item.tags, updatedAt: new Date().toISOString() }
        : item
    ));
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(`favorites_${section.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const handleCreate = (data: Record<string, unknown>, tags: string[] = []) => {
    const newItem: SectionItem = {
      id: `id-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`,
      sectionId: section.id,
      data,
      tags,
      updatedAt: new Date().toISOString(),
    };
    onItemsChange([...items, newItem]);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{section.name}</h1>
          <p className="text-sm text-zinc-500">{items.length} items • {favorites.size} favorites</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors">
          <Plus className="h-4 w-4" />
          New Item
        </button>
      </div>

      {/* Filters */}
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

        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            showFavoritesOnly 
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400" 
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          )}
        >
          <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-amber-400")} />
          Favorites
        </button>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
          <button onClick={() => setViewMode('table')} className={cn("rounded-md p-1.5 transition-colors", viewMode === 'table' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")} title="Table view">
            <Table2 className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={cn("rounded-md p-1.5 transition-colors", viewMode === 'list' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")} title="List view">
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('grid')} className={cn("rounded-md p-1.5 transition-colors", viewMode === 'grid' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")} title="Grid view">
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Item Form */}
      {isCreating && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <Plus className="h-4 w-4" />
            New {section.name.slice(0, -1)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input id="new-title" placeholder="Title..." className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
            <select id="new-category" className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none">
              {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>
          <textarea id="new-content" placeholder="Content..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none" rows={5} />
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700">
            <button onClick={() => setIsCreating(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
            <button 
              onClick={() => {
                const title = (document.getElementById('new-title') as HTMLInputElement).value;
                const category = (document.getElementById('new-category') as HTMLSelectElement).value;
                const content = (document.getElementById('new-content') as HTMLTextAreaElement).value;
                if (title.trim() && content.trim()) {
                  handleCreate({ title, category, content });
                }
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <CardItem
              key={item.id}
              item={item}
              isFavorite={favorites.has(item.id)}
              isCopied={copiedId === item.id}
              onCopy={() => handleCopy(String(item.data[copyField] || ''), item.id)}
              onUpdate={(data, tags) => handleUpdate(item.id, data, tags)}
              onDelete={() => handleDelete(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              categories={categories}
              copyField={copyField}
              viewMode="grid"
            />
          ))}
        </div>
      )}

      {/* Items List */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <CardItem
              key={item.id}
              item={item}
              isFavorite={favorites.has(item.id)}
              isCopied={copiedId === item.id}
              onCopy={() => handleCopy(String(item.data[copyField] || ''), item.id)}
              onUpdate={(data, tags) => handleUpdate(item.id, data, tags)}
              onDelete={() => handleDelete(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              categories={categories}
              copyField={copyField}
              viewMode="list"
            />
          ))}
        </div>
      )}

      {/* Items Table */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-zinc-800 bg-zinc-800/50">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase w-10"></th>
                <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase">Title</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase">Category</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase">Content</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredItems.map(item => {
                const title = String(item.data.title || 'Untitled');
                const content = String(item.data.content || '');
                const category = String(item.data.category || 'other');
                const categoryStyle = categories.find(c => c.value === category)?.color || categories[categories.length - 1].color;
                
                return (
                  <tr key={item.id} className="group hover:bg-zinc-800/50 transition-colors">
                    <td className="py-2 px-3">
                      <button onClick={() => handleToggleFavorite(item.id)} className="text-zinc-600 hover:text-amber-400">
                        {favorites.has(item.id) ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-zinc-100 font-medium">{title}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", categoryStyle)}>
                        {categories.find(c => c.value === category)?.label || category}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs truncate max-w-[150px]">{content.substring(0, 50)}...</span>
                        <CopyButton onCopy={() => handleCopy(content, item.id)} isCopied={copiedId === item.id} />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && !isCreating && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Grid className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No items found</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first item</p>
        </div>
      )}
    </div>
  );
}
