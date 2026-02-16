import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Trash2, ExternalLink, Link as LinkIcon, Edit2, Globe, CheckCircle, XCircle, RefreshCw, Filter, X, Check, Pencil } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { Resource } from '../types';
import { cn } from '../utils/cn';

const RESOURCE_CATEGORIES = [
  { value: 'tools', label: 'Tools', icon: '🔧' },
  { value: 'cheatsheets', label: 'Cheat Sheets', icon: '📋' },
  { value: 'wordlists', label: 'Wordlists', icon: '📝' },
  { value: 'payloads', label: 'Payloads', icon: '💉' },
  { value: 'exploits', label: 'Exploits', icon: '🎯' },
  { value: 'learning', label: 'Learning', icon: '📚' },
  { value: 'blogs', label: 'Blogs', icon: '✍️' },
  { value: 'labs', label: 'Labs', icon: '🧪' },
  { value: 'ctf', label: 'CTF', icon: '🚩' },
  { value: 'other', label: 'Other', icon: '📎' },
];

const getCategoryInfo = (category: string) => {
  return RESOURCE_CATEGORIES.find(c => c.value === category.toLowerCase()) || RESOURCE_CATEGORIES[RESOURCE_CATEGORIES.length - 1];
};

// Inline Edit Component
function InlineEdit({ 
  value, 
  onSave, 
  onCancel,
  placeholder = "Enter text...",
  className = "",
}: {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
          if (e.key === 'Escape') {
            onCancel();
          }
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 rounded bg-zinc-700 px-2 py-0.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <button onClick={handleSave} className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500 shrink-0">
        <Check className="h-3 w-3" />
      </button>
      <button onClick={onCancel} className="rounded bg-zinc-700 p-1 text-zinc-300 hover:bg-zinc-600 shrink-0">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// New Resource Inline Form
function NewResourceForm({ 
  onSave, 
  onCancel,
  defaultCategory = 'tools',
}: {
  onSave: (data: { title: string; url: string; category: string; note: string }) => void;
  onCancel: () => void;
  defaultCategory?: string;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (title.trim() && url.trim()) {
      try {
        new URL(url);
        onSave({ 
          title: title.trim(), 
          url: url.trim(), 
          category, 
          note: note.trim() 
        });
      } catch {
        // Invalid URL
      }
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
        <Plus className="h-4 w-4" />
        New Resource
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resource title..."
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          autoFocus
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          type="url"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
        >
          {RESOURCE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)..."
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !url.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Resource
        </button>
      </div>
    </div>
  );
}

// Resource Card Component
function ResourceCard({
  resource,
  linkStatus,
  onEdit,
  onDelete,
  onRename,
  onCheckLink,
}: {
  resource: Resource;
  linkStatus?: 'checking' | 'ok' | 'error';
  onEdit: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onCheckLink: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-blue-400">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {isRenaming ? (
              <InlineEdit
                value={resource.title}
                onSave={(newTitle) => { onRename(newTitle); setIsRenaming(false); }}
                onCancel={() => setIsRenaming(false)}
                placeholder="Resource title..."
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <a 
                  href={resource.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-semibold text-zinc-100 hover:text-emerald-400 transition-colors"
                >
                  <span className="truncate">{resource.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                </a>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="p-1 text-zinc-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 shrink-0"
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <p className="truncate text-xs text-zinc-500">{getHostname(resource.url)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {linkStatus && (
            <div className="shrink-0">
              {linkStatus === 'checking' && (
                <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
              )}
              {linkStatus === 'ok' && (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              )}
              {linkStatus === 'error' && (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {resource.note && (
        <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{resource.note}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {resource.category}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setIsRenaming(true)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={onEdit}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={onDelete}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Resources() {
  const { resources: resourcesApi, data } = useData();
  const resources = data.resources;
  
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [createForCategory, setCreateForCategory] = useState('tools');
  const [isEditing, setIsEditing] = useState<Resource | null>(null);
  const [linkStatus, setLinkStatus] = useState<Record<string, 'checking' | 'ok' | 'error'>>({});

  const handleDelete = (id: string) => {
    if (confirm('Delete this resource?')) {
      resourcesApi.delete(id);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    resourcesApi.update(id, { title: newTitle });
  };

  const handleCreate = (data: { title: string; url: string; category: string; note: string }) => {
    resourcesApi.add(data);
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const saveData = {
      title: formData.get('title') as string,
      url: formData.get('url') as string,
      category: formData.get('category') as string,
      note: formData.get('note') as string,
    };

    if (isEditing) {
      resourcesApi.update(isEditing.id, saveData);
    }

    setIsEditing(null);
  };

  const checkLink = async (id: string, url: string) => {
    setLinkStatus(prev => ({ ...prev, [id]: 'checking' }));
    try {
      new URL(url);
      await new Promise(resolve => setTimeout(resolve, 500));
      setLinkStatus(prev => ({ ...prev, [id]: 'ok' }));
    } catch {
      setLinkStatus(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  const checkAllLinks = () => {
    resources.forEach(r => checkLink(r.id, r.url));
  };

  const filteredResources = useMemo(() => resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
                          r.category.toLowerCase().includes(search.toLowerCase()) ||
                          r.note?.toLowerCase().includes(search.toLowerCase()) ||
                          r.url.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  }), [resources, search, filterCategory]);

  // Group by category
  const groupedResources = useMemo(() => {
    return filteredResources.reduce((acc, resource) => {
      const cat = resource.category.toLowerCase();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(resource);
      return acc;
    }, {} as Record<string, Resource[]>);
  }, [filteredResources]);

  const allCategories = [...new Set(resources.map(r => r.category.toLowerCase()))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Resources</h1>
          <p className="text-sm text-zinc-500">{resources.length} links • {allCategories.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={checkAllLinks}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Check Links
          </button>
          <button 
            onClick={() => { setIsCreating(true); setCreateForCategory('tools'); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search resources..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select 
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {RESOURCE_CATEGORIES.map(cat => {
          const count = resources.filter(r => r.category.toLowerCase() === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(filterCategory === cat.value ? 'all' : cat.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                filterCategory === cat.value
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              <span>{cat.icon}</span>
              {cat.label}
              <span className="text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* New Resource Form */}
      {isCreating && (
        <NewResourceForm
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
          defaultCategory={createForCategory}
        />
      )}

      {/* Resources List */}
      <div className="space-y-6">
        {Object.entries(groupedResources).sort().map(([category, categoryResources]) => {
          const catInfo = getCategoryInfo(category);
          return (
            <div key={category}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  <span>{catInfo.icon}</span>
                  {catInfo.label}
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs">
                    {categoryResources.length}
                  </span>
                </h2>
                <button
                  onClick={() => { 
                    setCreateForCategory(catInfo.value); 
                    setIsCreating(true); 
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    linkStatus={linkStatus[resource.id]}
                    onEdit={() => setIsEditing(resource)}
                    onDelete={() => handleDelete(resource.id)}
                    onRename={(newTitle) => handleRename(resource.id, newTitle)}
                    onCheckLink={() => checkLink(resource.id, resource.url)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(groupedResources).length === 0 && !isCreating && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <LinkIcon className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No resources found</p>
          <p className="mt-1 text-sm text-zinc-500">Add your first resource link</p>
        </div>
      )}

      {/* Edit Modal (only for full content editing) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xl font-bold text-zinc-100">Edit Resource</h2>
              <button onClick={() => setIsEditing(null)} className="text-zinc-400 hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Title</label>
                <input 
                  name="title" 
                  defaultValue={isEditing?.title}
                  required 
                  placeholder="e.g., PayloadsAllTheThings"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">URL</label>
                <input 
                  name="url" 
                  type="url" 
                  defaultValue={isEditing?.url}
                  required 
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Category</label>
                <select 
                  name="category" 
                  defaultValue={isEditing?.category || 'tools'}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  {RESOURCE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Note (optional)</label>
                <textarea 
                  name="note" 
                  defaultValue={isEditing?.note}
                  rows={2}
                  placeholder="Brief description or notes..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
