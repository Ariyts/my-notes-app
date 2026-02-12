import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Copy, Tag, Edit2, Trash2, Check, Filter, Grid, List, Star, StarOff, GripVertical, History } from 'lucide-react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { storageEnhanced, ordering } from '../lib/storage-enhanced';
import { Prompt } from '../types';
import { cn } from '../utils/cn';
import { HistoryPanel } from '../components/HistoryPanel';

const CATEGORIES = [
  { value: 'recon', label: 'Recon', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'exploit', label: 'Exploit', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'privesc', label: 'PrivEsc', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'persistence', label: 'Persistence', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'evasion', label: 'Evasion', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { value: 'reporting', label: 'Reporting', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'social', label: 'Social Eng', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
];

const getCategoryStyle = (category: string) => {
  return CATEGORIES.find(c => c.value === category)?.color || CATEGORIES[CATEGORIES.length - 1].color;
};

// Sortable Prompt Card
function SortablePromptCard({ 
  prompt, 
  isSelected,
  isFavorite,
  isCopied,
  onCopy, 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onTagClick,
  onSelect,
  viewMode 
}: {
  prompt: Prompt;
  isSelected: boolean;
  isFavorite: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onTagClick: (tag: string) => void;
  onSelect: () => void;
  viewMode: 'grid' | 'list';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prompt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-zinc-900 transition-all hover:border-zinc-600",
        isFavorite ? "border-amber-500/30" : "border-zinc-800",
        isDragging && "opacity-50 scale-105 z-50",
        isSelected && "ring-2 ring-emerald-500"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFavorite}
                className="shrink-0 text-zinc-600 hover:text-amber-400"
              >
                {isFavorite 
                  ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  : <StarOff className="h-4 w-4" />
                }
              </button>
              <h3 
                className="font-semibold text-zinc-100 truncate cursor-pointer hover:text-emerald-400"
                onClick={onSelect}
              >
                {prompt.title}
              </h3>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={cn("rounded-md border px-2 py-0.5 font-medium", getCategoryStyle(prompt.category))}>
                {prompt.category}
              </span>
              <span className="text-zinc-500">
                {new Date(prompt.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={onCopy}
              className={cn(
                "rounded-lg p-2 transition-colors",
                isCopied 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
              )}
              title="Copy Prompt"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button 
              onClick={onEdit}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button 
              onClick={onDelete}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div 
          className="mt-3 cursor-pointer rounded-lg bg-zinc-950 p-3 text-sm text-zinc-300 font-mono overflow-hidden hover:bg-zinc-950/80 transition-colors"
          onClick={onCopy}
        >
          <pre className={cn(
            "whitespace-pre-wrap break-words",
            viewMode === 'grid' ? "line-clamp-4" : "line-clamp-3"
          )}>{prompt.content}</pre>
        </div>

        {prompt.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {prompt.tags.map(tag => (
              <span 
                key={tag} 
                className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-700"
                onClick={() => onTagClick(tag)}
              >
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

export function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isEditing, setIsEditing] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadedPrompts = storageEnhanced.prompts.getAll();
    const savedOrder = ordering.getPromptOrder();
    
    // Sort by saved order if exists
    if (savedOrder.length > 0) {
      loadedPrompts.sort((a, b) => {
        const aIndex = savedOrder.indexOf(a.id);
        const bIndex = savedOrder.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    
    setPrompts(loadedPrompts);
    
    // Load favorites
    const savedFavs = localStorage.getItem('prompt_favorites');
    if (savedFavs) setFavorites(new Set(JSON.parse(savedFavs)));
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('prompt_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this prompt?')) {
      storageEnhanced.prompts.delete(id);
      setPrompts(storageEnhanced.prompts.getAll());
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);
    
    const data = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      content: formData.get('content') as string,
      tags
    };

    if (isEditing) {
      storageEnhanced.prompts.update(isEditing.id, data);
    } else {
      storageEnhanced.prompts.add(data);
    }

    setPrompts(storageEnhanced.prompts.getAll());
    setIsEditing(null);
    setIsCreating(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPrompts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Save new order
        ordering.savePromptOrder(newItems.map(p => p.id));
        
        return newItems;
      });
    }
  };

  const handleRestoreVersion = (content: string, title: string) => {
    const prompt = prompts.find(p => p.id === selectedPromptId);
    if (prompt) {
      setIsEditing({ ...prompt, content, title });
    }
  };

  const filteredPrompts = useMemo(() => {
    return prompts
      .filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                              p.content.toLowerCase().includes(search.toLowerCase()) ||
                              p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = filter === 'all' || p.category === filter;
        const matchesFavorites = !showFavoritesOnly || favorites.has(p.id);
        return matchesSearch && matchesCategory && matchesFavorites;
      })
      .sort((a, b) => {
        // Favorites first
        const aFav = favorites.has(a.id) ? 0 : 1;
        const bFav = favorites.has(b.id) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return 0; // Keep custom order
      });
  }, [prompts, search, filter, showFavoritesOnly, favorites]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Prompts Library</h1>
          <p className="text-sm text-zinc-500">{prompts.length} prompts • {favorites.size} favorites • Drag to reorder</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Prompt
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search prompts by title, content, or tags..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select 
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
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

        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === 'list' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === 'grid' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
            filter === 'all' 
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
          )}
        >
          All ({prompts.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = prompts.filter(p => p.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                filter === cat.value 
                  ? cat.color + " border" 
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Prompts Grid/List with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredPrompts.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className={cn(
            viewMode === 'grid' 
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
              : "space-y-3"
          )}>
            {filteredPrompts.map((prompt) => (
              <SortablePromptCard
                key={prompt.id}
                prompt={prompt}
                isSelected={selectedPromptId === prompt.id}
                isFavorite={favorites.has(prompt.id)}
                isCopied={copiedId === prompt.id}
                onCopy={() => handleCopy(prompt.content, prompt.id)}
                onEdit={() => setIsEditing(prompt)}
                onDelete={() => handleDelete(prompt.id)}
                onToggleFavorite={() => toggleFavorite(prompt.id)}
                onTagClick={(tag) => setSearch(tag)}
                onSelect={() => setSelectedPromptId(prompt.id)}
                viewMode={viewMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredPrompts.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Search className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No prompts found</p>
          <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xl font-bold text-zinc-100">
                {isEditing ? 'Edit Prompt' : 'New Prompt'}
              </h2>
              {isEditing && (
                <button
                  onClick={() => { setSelectedPromptId(isEditing.id); setShowHistory(true); }}
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  <History className="h-4 w-4" />
                  History
                </button>
              )}
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Title</label>
                <input 
                  name="title" 
                  defaultValue={isEditing?.title}
                  required
                  placeholder="e.g., SQL Injection Detection"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Category</label>
                  <select 
                    name="category" 
                    defaultValue={isEditing?.category || 'recon'}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tags (comma separated)</label>
                  <input 
                    name="tags" 
                    defaultValue={isEditing?.tags.join(', ')}
                    placeholder="llm, gpt, injection"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Prompt Content</label>
                <textarea 
                  name="content" 
                  defaultValue={isEditing?.content}
                  required
                  rows={10}
                  placeholder="Enter your prompt here..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => { setIsCreating(false); setIsEditing(null); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  {isEditing ? 'Update Prompt' : 'Create Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        itemId={selectedPromptId || ''}
        itemType="prompt"
        onRestore={handleRestoreVersion}
      />
    </div>
  );
}
