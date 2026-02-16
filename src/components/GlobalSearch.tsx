import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Terminal, Link as LinkIcon, Zap, X } from 'lucide-react';
import { storage } from '../lib/storage';
import { cn } from '../utils/cn';

interface SearchResult {
  id: string;
  type: 'prompt' | 'note' | 'snippet' | 'resource';
  title: string;
  subtitle: string;
  content: string;
  path: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICONS = {
  prompt: Zap,
  note: FileText,
  snippet: Terminal,
  resource: LinkIcon,
};

const TYPE_COLORS = {
  prompt: 'text-purple-400',
  note: 'text-blue-400',
  snippet: 'text-green-400',
  resource: 'text-orange-400',
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Collect all searchable items
  const allItems = useMemo((): SearchResult[] => {
    const items: SearchResult[] = [];

    storage.prompts.getAll().forEach(p => {
      items.push({
        id: p.id,
        type: 'prompt',
        title: p.title,
        subtitle: p.category,
        content: p.content,
        path: '/',
      });
    });

    storage.notes.getAll().forEach(n => {
      items.push({
        id: n.id,
        type: 'note',
        title: n.title,
        subtitle: n.category,
        content: n.content,
        path: '/notes',
      });
    });

    storage.snippets.getAll().forEach(s => {
      items.push({
        id: s.id,
        type: 'snippet',
        title: s.title,
        subtitle: s.tool,
        content: s.command,
        path: '/snippets',
      });
    });

    const resources = JSON.parse(localStorage.getItem('pentest_resources') || '[]');
    resources.forEach((r: any) => {
      items.push({
        id: r.id,
        type: 'resource',
        title: r.title,
        subtitle: r.category,
        content: r.note || '',
        path: '/resources',
      });
    });

    return items;
  }, [isOpen]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);
    
    const q = query.toLowerCase();
    return allItems
      .filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, allItems]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigate(results[selectedIndex].path);
            onClose();
            setQuery('');
          }
          break;
        case 'Escape':
          onClose();
          setQuery('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { onClose(); setQuery(''); }}
      />
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4">
          <Search className="h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search everything... (prompts, notes, snippets, resources)"
            className="flex-1 bg-transparent py-4 text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button 
            onClick={() => { onClose(); setQuery(''); }}
            className="rounded p-1 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No results found for "{query}"
            </div>
          ) : (
            results.map((result, index) => {
              const Icon = TYPE_ICONS[result.type];
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    index === selectedIndex 
                      ? "bg-zinc-800" 
                      : "hover:bg-zinc-800/50"
                  )}
                  onClick={() => {
                    navigate(result.path);
                    onClose();
                    setQuery('');
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={cn("rounded-md bg-zinc-800 p-2", TYPE_COLORS[result.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-zinc-100">{result.title}</div>
                    <div className="truncate text-sm text-zinc-500">
                      {result.subtitle} • {result.content.slice(0, 60)}...
                    </div>
                  </div>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-400">
                    {result.type}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span><kbd className="rounded bg-zinc-800 px-1.5 py-0.5">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded bg-zinc-800 px-1.5 py-0.5">Enter</kbd> Open</span>
            <span><kbd className="rounded bg-zinc-800 px-1.5 py-0.5">Esc</kbd> Close</span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
