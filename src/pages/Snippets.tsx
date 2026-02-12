import { useState, useEffect } from 'react';
import { Plus, Search, Copy, Check, Terminal, Trash2, Edit2, ChevronDown, Filter } from 'lucide-react';
import { storage } from '../lib/storage';
import { Snippet } from '../types';
import { cn } from '../utils/cn';

const TOOL_PRESETS = [
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

const getToolStyle = (tool: string) => {
  const preset = TOOL_PRESETS.find(t => t.name.toLowerCase() === tool.toLowerCase());
  return preset || { name: tool, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
};

export function Snippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [search, setSearch] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<Snippet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  useEffect(() => {
    const loaded = storage.snippets.getAll();
    setSnippets(loaded);
    // Expand all tools by default
    setExpandedGroups(new Set(loaded.map(s => s.tool.toLowerCase())));
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this snippet?')) {
      storage.snippets.delete(id);
      setSnippets(storage.snippets.getAll());
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);
    
    const data = {
      title: formData.get('title') as string,
      tool: formData.get('tool') as string,
      command: formData.get('command') as string,
      description: formData.get('description') as string,
      tags
    };

    if (isEditing) {
      storage.snippets.update(isEditing.id, data);
    } else {
      storage.snippets.add(data);
    }

    setSnippets(storage.snippets.getAll());
    setIsEditing(null);
    setIsCreating(false);
  };

  const toggleGroup = (tool: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
      } else {
        next.add(tool);
      }
      return next;
    });
  };

  const filteredSnippets = snippets.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.tool.toLowerCase().includes(search.toLowerCase()) ||
                          s.command.toLowerCase().includes(search.toLowerCase());
    const matchesTool = filterTool === 'all' || s.tool.toLowerCase() === filterTool.toLowerCase();
    return matchesSearch && matchesTool;
  });

  // Group by tool
  const groupedSnippets = filteredSnippets.reduce((acc, snippet) => {
    const tool = snippet.tool.toLowerCase();
    if (!acc[tool]) acc[tool] = [];
    acc[tool].push(snippet);
    return acc;
  }, {} as Record<string, Snippet[]>);

  // Get unique tools for filter
  const allTools = [...new Set(snippets.map(s => s.tool.toLowerCase()))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Command Snippets</h1>
          <p className="text-sm text-zinc-500">{snippets.length} commands • {allTools.length} tools</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Snippet
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
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
          >
            <option value="all">All Tools</option>
            {allTools.map(tool => (
              <option key={tool} value={tool}>{tool}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tool Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {TOOL_PRESETS.slice(0, 8).map(preset => {
          const count = snippets.filter(s => s.tool.toLowerCase() === preset.name).length;
          if (count === 0) return null;
          return (
            <button
              key={preset.name}
              onClick={() => setFilterTool(filterTool === preset.name ? 'all' : preset.name)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                filterTool === preset.name
                  ? `${preset.bg} ${preset.color} border-current`
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              <Terminal className="h-3 w-3" />
              {preset.name}
              <span className="text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grouped Snippets */}
      <div className="space-y-4">
        {Object.entries(groupedSnippets).sort().map(([tool, toolSnippets]) => {
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
                    {toolSnippets.length}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-zinc-500 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>

              {/* Snippets */}
              {isExpanded && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                  {toolSnippets.map((snippet) => (
                    <div key={snippet.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-zinc-100">{snippet.title}</h3>
                          {snippet.description && (
                            <p className="mt-0.5 text-sm text-zinc-500">{snippet.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => setIsEditing(snippet)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-100"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(snippet.id)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Command */}
                      <div 
                        className="group mt-3 flex items-center gap-3 rounded-lg bg-black p-3 cursor-pointer hover:bg-zinc-950 transition-colors"
                        onClick={() => handleCopy(snippet.command, snippet.id)}
                      >
                        <code className="flex-1 font-mono text-sm text-green-400 break-all whitespace-pre-wrap">
                          {snippet.command}
                        </code>
                        <button className="shrink-0 rounded-md p-1 text-zinc-600 hover:text-emerald-400 transition-colors">
                          {copiedId === snippet.id 
                            ? <Check className="h-4 w-4 text-emerald-400" /> 
                            : <Copy className="h-4 w-4" />
                          }
                        </button>
                      </div>

                      {/* Tags */}
                      {snippet.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {snippet.tags.map(tag => (
                            <span 
                              key={tag} 
                              className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(groupedSnippets).length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Terminal className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No snippets found</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first command snippet</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xl font-bold text-zinc-100">
                {isEditing ? 'Edit Snippet' : 'New Snippet'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Title</label>
                <input 
                  name="title" 
                  defaultValue={isEditing?.title}
                  required
                  placeholder="e.g., Quick Port Scan"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tool</label>
                  <input 
                    name="tool" 
                    defaultValue={isEditing?.tool}
                    required
                    placeholder="e.g., nmap"
                    list="tool-presets"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                  />
                  <datalist id="tool-presets">
                    {TOOL_PRESETS.map(t => (
                      <option key={t.name} value={t.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tags</label>
                  <input 
                    name="tags" 
                    defaultValue={isEditing?.tags.join(', ')}
                    placeholder="scan, recon"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Command</label>
                <textarea 
                  name="command" 
                  defaultValue={isEditing?.command}
                  required
                  rows={4}
                  placeholder="nmap -sV -sC -oA scan target.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-green-400 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Description (optional)</label>
                <input 
                  name="description" 
                  defaultValue={isEditing?.description}
                  placeholder="Brief description of what this does"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
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
                  {isEditing ? 'Update Snippet' : 'Create Snippet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
