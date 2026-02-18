/**
 * Commands View
 * 
 * Displays command snippets grouped by tool with copy-on-click functionality.
 * Used for Snippets and similar command collections.
 */

import { useState, useMemo } from 'react';
import { Plus, Search, Copy, Check, Terminal, Trash2, Edit2, ChevronDown, Filter, X, Pencil, Tag, Settings2 } from 'lucide-react';
import { Section, SectionItem } from '../../types/sections';
import { cn } from '../../utils/cn';

// Default tool presets with colors
const DEFAULT_TOOLS = [
  { name: 'nmap', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { name: 'ffuf', color: 'text-green-400', bg: 'bg-green-500/10' },
  { name: 'nuclei', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { name: 'burp', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { name: 'sqlmap', color: 'text-red-400', bg: 'bg-red-500/10' },
  { name: 'gobuster', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { name: 'hydra', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { name: 'curl', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { name: 'netcat', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { name: 'python', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { name: 'bash', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  { name: 'powershell', color: 'text-blue-400', bg: 'bg-blue-500/10' },
];

interface CommandsViewProps {
  section: Section;
  items: SectionItem[];
  onItemsChange: (items: SectionItem[]) => void;
}

function CopyButton({ onCopy, isCopied }: { onCopy: () => void; isCopied: boolean }) {
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
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function CommandsView({ section, items, onItemsChange }: CommandsViewProps) {
  const [search, setSearch] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForTool, setCreateForTool] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // Get tool style
  const getToolStyle = (toolName: string) => {
    const found = DEFAULT_TOOLS.find(t => t.name.toLowerCase() === toolName.toLowerCase());
    return found || { name: toolName, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
  };

  // Filtered items
  const filteredItems = useMemo(() => 
    items.filter(item => {
      const title = String(item.data.title || '');
      const tool = String(item.data.tool || '');
      const command = String(item.data.command || '');
      
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) || 
                           tool.toLowerCase().includes(search.toLowerCase()) ||
                           command.toLowerCase().includes(search.toLowerCase());
      const matchesTool = filterTool === 'all' || tool.toLowerCase() === filterTool.toLowerCase();
      return matchesSearch && matchesTool;
    }),
    [items, search, filterTool]
  );

  // Group by tool
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const tool = String(item.data.tool || 'other').toLowerCase();
      if (!acc[tool]) acc[tool] = [];
      acc[tool].push(item);
      return acc;
    }, {} as Record<string, SectionItem[]>);
  }, [filteredItems]);

  // All unique tools
  const allTools = [...new Set(items.map(item => String(item.data.tool || 'other').toLowerCase()))].sort();

  // Handlers
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    setCreateForTool('');
  };

  const toggleGroup = (tool: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{section.name}</h1>
          <p className="text-sm text-zinc-500">{items.length} commands • {allTools.length} tools</p>
        </div>
        <button onClick={() => { setIsCreating(true); setCreateForTool(''); }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors">
          <Plus className="h-4 w-4" />
          New Command
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search commands, tools, or titles..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Tools</option>
            {allTools.map(tool => (
              <option key={tool} value={tool}>{tool}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tool Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {DEFAULT_TOOLS.slice(0, 8).map(toolDef => {
          const count = items.filter(item => String(item.data.tool || '').toLowerCase() === toolDef.name.toLowerCase()).length;
          if (count === 0) return null;
          return (
            <button
              key={toolDef.name}
              onClick={() => setFilterTool(filterTool === toolDef.name.toLowerCase() ? 'all' : toolDef.name.toLowerCase())}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                filterTool === toolDef.name.toLowerCase()
                  ? `${toolDef.bg} ${toolDef.color} border-current`
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              <Terminal className="h-3 w-3" />
              {toolDef.name}
              <span className="text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* New Command Form */}
      {isCreating && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <Plus className="h-4 w-4" />
            New Command
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input id="new-title" placeholder="Title..." className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
            <input id="new-tool" placeholder="Tool (e.g., nmap)" defaultValue={createForTool} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <textarea id="new-command" placeholder="Enter your command..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-green-400 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none resize-none" rows={3} />
          <input id="new-description" placeholder="Description (optional)..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700">
            <button onClick={() => { setIsCreating(false); setCreateForTool(''); }} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
            <button
              onClick={() => {
                const title = (document.getElementById('new-title') as HTMLInputElement).value;
                const tool = (document.getElementById('new-tool') as HTMLInputElement).value;
                const command = (document.getElementById('new-command') as HTMLTextAreaElement).value;
                const description = (document.getElementById('new-description') as HTMLInputElement).value;
                if (title.trim() && tool.trim() && command.trim()) {
                  handleCreate({ title, tool, command, description });
                }
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Grouped Commands */}
      <div className="space-y-4">
        {Object.entries(groupedItems).sort().map(([tool, toolItems]) => {
          const toolStyle = getToolStyle(tool);
          const isExpanded = expandedGroups.has(tool);

          return (
            <div key={tool} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              {/* Tool Header */}
              <button
                onClick={() => toggleGroup(tool)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toolStyle.bg)}>
                    <Terminal className={cn("h-4 w-4", toolStyle.color)} />
                  </div>
                  <span className="font-semibold text-zinc-100 capitalize">{tool}</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {toolItems.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreateForTool(tool); setIsCreating(true); }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700"
                    title="Add snippet to this tool"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </button>

              {/* Commands */}
              {isExpanded && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                  {toolItems.map((item) => {
                    const title = String(item.data.title || '');
                    const command = String(item.data.command || '');
                    const description = String(item.data.description || '');

                    return (
                      <div key={item.id} className="p-4 hover:bg-zinc-800/30 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-zinc-100">{title}</h3>
                            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Command */}
                        <div className="mt-3 rounded-lg bg-black p-3">
                          <code className="block font-mono text-sm text-green-400 break-all whitespace-pre-wrap">
                            {command}
                          </code>
                          <div className="mt-2 flex justify-end">
                            <CopyButton onCopy={() => handleCopy(command, item.id)} isCopied={copiedId === item.id} />
                          </div>
                        </div>

                        {/* Tags */}
                        {item.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {item.tags.map(tag => (
                              <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(groupedItems).length === 0 && !isCreating && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Terminal className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No commands found</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first command snippet</p>
        </div>
      )}
    </div>
  );
}
