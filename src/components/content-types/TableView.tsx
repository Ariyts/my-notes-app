/**
 * Table View
 * 
 * Displays items in a simple table format with sorting and filtering.
 * Generic view that can be used for various content types.
 */

import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Section, SectionItem } from '../../types/sections';
import { cn } from '../../utils/cn';

interface TableViewProps {
  section: Section;
  items: SectionItem[];
  onItemsChange: (items: SectionItem[]) => void;
}

type SortDirection = 'asc' | 'desc';

export function TableView({ section, items, onItemsChange }: TableViewProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isCreating, setIsCreating] = useState(false);

  // Get fields from section config or use defaults
  const fields = section.config?.fields || [
    { name: 'title', label: 'Title', type: 'text' as const },
    { name: 'description', label: 'Description', type: 'text' as const },
    { name: 'status', label: 'Status', type: 'select' as const, options: ['active', 'pending', 'done'] },
  ];

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const searchStr = Object.values(item.data).join(' ').toLowerCase();
      return searchStr.includes(search.toLowerCase());
    });

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = String(a.data[sortField] || '');
      const bVal = String(b.data[sortField] || '');
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, search, sortField, sortDirection]);

  // Handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{section.name}</h1>
          <p className="text-sm text-zinc-500">{items.length} items</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors">
          <Plus className="h-4 w-4" />
          New Item
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* New Item Form */}
      {isCreating && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <Plus className="h-4 w-4" />
              New Item
            </div>
            <button onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map(field => (
              <div key={field.name}>
                <label className="block text-xs text-zinc-400 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select id={`new-${field.name}`} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none" defaultValue={field.default}>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea id={`new-${field.name}`} placeholder={field.placeholder} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none" rows={2} />
                ) : (
                  <input id={`new-${field.name}`} type={field.type === 'date' ? 'date' : 'text'} placeholder={field.placeholder} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700">
            <button onClick={() => setIsCreating(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
            <button
              onClick={() => {
                const data: Record<string, unknown> = {};
                fields.forEach(field => {
                  const el = document.getElementById(`new-${field.name}`);
                  if (el) {
                    data[field.name] = (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
                  }
                });
                if (Object.values(data).some(v => v)) {
                  handleCreate(data);
                }
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-800 bg-zinc-800/50">
              <tr>
                {fields.map(field => (
                  <th
                    key={field.name}
                    className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort(field.name)}
                  >
                    <div className="flex items-center gap-1">
                      {field.label}
                      {sortField === field.name && (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredItems.map(item => (
                <tr key={item.id} className="group hover:bg-zinc-800/50 transition-colors">
                  {fields.map(field => (
                    <td key={field.name} className="py-2 px-3">
                      <span className="text-zinc-100">
                        {field.type === 'select' ? (
                          <span className={cn(
                            "rounded-md border px-2 py-0.5 text-xs font-medium",
                            String(item.data[field.name] || '') === 'done' && "bg-green-500/10 text-green-400 border-green-500/30",
                            String(item.data[field.name] || '') === 'pending' && "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                            String(item.data[field.name] || '') === 'active' && "bg-blue-500/10 text-blue-400 border-blue-500/30",
                          )}>
                            {String(item.data[field.name] || '-')}
                          </span>
                        ) : (
                          String(item.data[field.name] || '-')
                        )}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && !isCreating && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-zinc-400">No items found</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first item</p>
        </div>
      )}
    </div>
  );
}
