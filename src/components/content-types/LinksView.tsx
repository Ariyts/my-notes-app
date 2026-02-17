/**
 * Links View
 * 
 * Displays a collection of links with categories and metadata.
 * Used for Resources and similar link collections.
 */

import { useState, useMemo } from 'react';
import { Plus, Search, ExternalLink, Copy, Check, Trash2, Globe, Tag, X } from 'lucide-react';
import { Section, SectionItem } from '../../types/sections';
import { cn } from '../../utils/cn';

// Default categories with colors
const DEFAULT_CATEGORIES = [
  { value: 'tools', label: 'Tools', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'cheatsheets', label: 'Cheatsheets', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'wordlists', label: 'Wordlists', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'payloads', label: 'Payloads', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'exploits', label: 'Exploits', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'learning', label: 'Learning', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { value: 'blogs', label: 'Blogs', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { value: 'labs', label: 'Labs', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'ctf', label: 'CTF', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
];

interface LinksViewProps {
  section: Section;
  items: SectionItem[];
  onItemsChange: (items: SectionItem[]) => void;
}

export function LinksView({ section, items, onItemsChange }: LinksViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Get categories from section config or use defaults
  const categories = section.config?.categories
    ? section.config.categories.map((cat, idx) => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        color: DEFAULT_CATEGORIES.find(c => c.value === cat)?.color || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1].color,
      }))
    : DEFAULT_CATEGORIES;

  // Filtered items
  const filteredItems = useMemo(() => 
    items.filter(item => {
      const title = String(item.data.title || '');
      const url = String(item.data.url || '');
      const category = String(item.data.category || '');
      
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) || 
                           url.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filter === 'all' || category === filter;
      return matchesSearch && matchesCategory;
    }),
    [items, search, filter]
  );

  // Handlers
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
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

  const getCategoryStyle = (category: string) => {
    return categories.find(c => c.value === category)?.color || categories[categories.length - 1].color;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{section.name}</h1>
          <p className="text-sm text-zinc-500">{items.length} links</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors">
          <Plus className="h-4 w-4" />
          New Link
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search links..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
      </div>

      {/* New Link Form */}
      {isCreating && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <Plus className="h-4 w-4" />
            New Link
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input id="new-title" placeholder="Title..." className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
            <input id="new-url" placeholder="URL..." className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select id="new-category" className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none">
              {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
            <input id="new-note" placeholder="Note (optional)..." className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700">
            <button onClick={() => setIsCreating(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
            <button
              onClick={() => {
                const title = (document.getElementById('new-title') as HTMLInputElement).value;
                const url = (document.getElementById('new-url') as HTMLInputElement).value;
                const category = (document.getElementById('new-category') as HTMLSelectElement).value;
                const note = (document.getElementById('new-note') as HTMLInputElement).value;
                if (title.trim() && url.trim()) {
                  handleCreate({ title, url, category, note });
                }
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const title = String(item.data.title || 'Untitled');
          const url = String(item.data.url || '');
          const category = String(item.data.category || 'other');
          const note = String(item.data.note || '');

          // Extract domain for favicon
          let domain = '';
          try {
            domain = new URL(url).hostname;
          } catch {
            domain = url;
          }

          return (
            <div key={item.id} className="group rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
                      <Globe className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-100 truncate" title={title}>{title}</h3>
                      <p className="text-xs text-zinc-500 truncate" title={url}>{domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(url, item.id)}
                      className={cn(
                        "rounded-lg p-1.5 transition-colors",
                        copiedId === item.id ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                      )}
                      title="Copy URL"
                    >
                      {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleOpen(url)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                      title="Open link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="mt-3">
                  <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", getCategoryStyle(category))}>
                    {categories.find(c => c.value === category)?.label || category}
                  </span>
                </div>

                {/* Note */}
                {note && (
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && !isCreating && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Globe className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No links found</p>
          <p className="mt-1 text-sm text-zinc-500">Add your first resource link</p>
        </div>
      )}
    </div>
  );
}
