import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Plus, Search, Save, Trash2, FileText, Folder, FolderOpen,
  Edit3, Eye, ChevronRight, ChevronDown, Copy, Check, Columns,
  History, FileCode, LayoutTemplate
} from 'lucide-react';
import { storageEnhanced } from '../lib/storage-enhanced';
import { Note } from '../types';
import { cn } from '../utils/cn';
import { HistoryPanel } from '../components/HistoryPanel';
import { TemplateSelector } from '../components/TemplateSelector';
import { NoteTemplate } from '../lib/templates';

const PREDEFINED_CATEGORIES = [
  'Web/Recon',
  'Web/Auth Bypass',
  'Web/XSS',
  'Web/SQLi',
  'Web/SSRF',
  'Web/CSRF',
  'Web/File Upload',
  'Network/Scanning',
  'Network/Exploitation',
  'Active Directory/Enumeration',
  'Active Directory/Kerberos',
  'Active Directory/Lateral Movement',
  'Cloud/AWS',
  'Cloud/Azure',
  'Cloud/GCP',
  'Mobile/Android',
  'Mobile/iOS',
  'Methodology/General',
  'Methodology/Reporting',
];

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'split'>('split');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  
  // Modals
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Form state for editing
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [hasUnsaved, setHasUnsaved] = useState(false);

  useEffect(() => {
    const loadedNotes = storageEnhanced.notes.getAll();
    setNotes(loadedNotes);
    
    // Expand all root categories
    const roots = new Set(loadedNotes.map(n => n.category.split('/')[0]));
    setExpandedFolders(roots);
    
    if (loadedNotes.length > 0 && !selectedNoteId) {
      selectNote(loadedNotes[0]);
    }
  }, []);

  const selectNote = (note: Note) => {
    if (hasUnsaved && !confirm('Discard unsaved changes?')) return;
    
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditCategory(note.category);
    setEditContent(note.content);
    setEditTags(note.tags.join(', '));
    setHasUnsaved(false);
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setHasUnsaved(true);
  };

  const handleCreate = () => {
    setShowTemplates(true);
  };

  const handleCreateFromTemplate = (template: NoteTemplate) => {
    const newNote = storageEnhanced.notes.add({
      title: template.name,
      category: template.category,
      content: template.content,
      tags: []
    });
    setNotes(storageEnhanced.notes.getAll());
    selectNote(newNote);
    setViewMode('edit');
  };

  const handleCreateBlank = () => {
    const newNote = storageEnhanced.notes.add({
      title: 'Untitled Note',
      category: 'Methodology/General',
      content: '# New Note\n\nStart writing your notes here...\n\n## Example Section\n\n```bash\necho "Hello World"\n```',
      tags: []
    });
    setNotes(storageEnhanced.notes.getAll());
    selectNote(newNote);
    setViewMode('edit');
  };

  const handleSave = useCallback(() => {
    if (!selectedNoteId) return;
    
    storageEnhanced.notes.update(selectedNoteId, {
      title: editTitle,
      category: editCategory,
      content: editContent,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
    });
    
    setNotes(storageEnhanced.notes.getAll());
    setHasUnsaved(false);
  }, [selectedNoteId, editTitle, editCategory, editContent, editTags]);

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleDelete = () => {
    if (!selectedNoteId || !confirm('Delete this note permanently?')) return;
    
    storageEnhanced.notes.delete(selectedNoteId);
    const updatedNotes = storageEnhanced.notes.getAll();
    setNotes(updatedNotes);
    
    if (updatedNotes.length > 0) {
      selectNote(updatedNotes[0]);
    } else {
      setSelectedNoteId(null);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(editContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestoreVersion = (content: string, title: string) => {
    setEditContent(content);
    setEditTitle(title);
    setHasUnsaved(true);
  };

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

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.category.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  // Build tree structure
  const buildTree = () => {
    const tree: Record<string, Record<string, Note[]>> = {};
    
    filteredNotes.forEach(note => {
      const parts = note.category.split('/');
      const root = parts[0] || 'Uncategorized';
      const sub = parts.slice(1).join('/') || '_root';
      
      if (!tree[root]) tree[root] = {};
      if (!tree[root][sub]) tree[root][sub] = [];
      tree[root][sub].push(note);
    });
    
    return tree;
  };

  const tree = buildTree();
  const selectedNote = notes.find(n => n.id === selectedNoteId);
  
  // Get version count for current note
  const versionCount = selectedNoteId 
    ? storageEnhanced.history.getForItem(selectedNoteId).length 
    : 0;

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sidebar Tree */}
      <div className="flex w-72 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="border-b border-zinc-800 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">Notes</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleCreateBlank}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New Blank Note"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button 
                onClick={handleCreate}
                className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500"
                title="New from Template"
              >
                <LayoutTemplate className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full rounded-lg bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
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
                  {Object.entries(subCategories).sort().map(([subCategory, categoryNotes]) => (
                    <div key={subCategory} className="mt-1">
                      {subCategory !== '_root' && (
                        <div className="px-2 py-1 text-xs font-medium text-zinc-500">
                          {subCategory}
                        </div>
                      )}
                      {categoryNotes.map(note => (
                        <button
                          key={note.id}
                          onClick={() => selectNote(note)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                            selectedNoteId === note.id 
                              ? "bg-emerald-600/20 text-emerald-400" 
                              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{note.title}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(tree).length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-500">
              No notes found
            </div>
          )}
        </div>

        {/* Category Quick Add */}
        <div className="border-t border-zinc-800 p-2">
          <select 
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value=""
            onChange={(e) => {
              if (e.target.value && selectedNoteId) {
                setEditCategory(e.target.value);
                setHasUnsaved(true);
              }
            }}
          >
            <option value="">Quick set category...</option>
            {PREDEFINED_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Editor/View Area */}
      <div className="flex flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur overflow-hidden">
        {selectedNote ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); setHasUnsaved(true); }}
                  className="bg-transparent text-xl font-bold text-zinc-100 focus:outline-none flex-1 min-w-0"
                  placeholder="Note Title"
                />
                {hasUnsaved && (
                  <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                    Unsaved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg bg-zinc-800 p-0.5">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === 'edit' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                    title="Edit Mode"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === 'split' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                    title="Split View"
                  >
                    <Columns className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('view')}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === 'view' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                    title="Preview Mode"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* History button */}
                <button 
                  onClick={() => setShowHistory(true)}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    versionCount > 0 
                      ? "text-purple-400 hover:bg-purple-500/10" 
                      : "text-zinc-600"
                  )}
                  title={`Version History (${versionCount})`}
                  disabled={versionCount === 0}
                >
                  <History className="h-4 w-4" />
                  {versionCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px]">{versionCount}</span>
                  )}
                </button>

                <button 
                  onClick={handleCopyContent}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  title="Copy content"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                
                <button 
                  onClick={handleSave}
                  disabled={!hasUnsaved}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    hasUnsaved 
                      ? "bg-emerald-600 text-white hover:bg-emerald-500" 
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                
                <button 
                  onClick={handleDelete}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Category & Tags Bar */}
            <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Category:</span>
                <input
                  value={editCategory}
                  onChange={(e) => { setEditCategory(e.target.value); setHasUnsaved(true); }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g., Web/XSS"
                  list="categories"
                />
                <datalist id="categories">
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-zinc-500">Tags:</span>
                <input
                  value={editTags}
                  onChange={(e) => { setEditTags(e.target.value); setHasUnsaved(true); }}
                  className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="tag1, tag2, tag3..."
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={cn("flex flex-col overflow-hidden", viewMode === 'split' ? "w-1/2 border-r border-zinc-800" : "flex-1")}>
                  <div className="flex items-center justify-between bg-zinc-800/50 px-3 py-1 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-3 w-3" />
                      <span>Markdown Editor</span>
                    </div>
                    <span>{editContent.length} chars</span>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm text-zinc-300 focus:outline-none"
                    placeholder="Type your markdown here..."
                    spellCheck={false}
                  />
                </div>
              )}
              
              {(viewMode === 'view' || viewMode === 'split') && (
                <div className={cn("flex flex-col overflow-hidden", viewMode === 'split' ? "w-1/2" : "flex-1")}>
                  <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-500">
                    <Eye className="h-3 w-3" />
                    <span>Preview</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="prose prose-invert max-w-none prose-headings:text-zinc-100 prose-a:text-emerald-400 prose-code:text-emerald-300 prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !match;
                            return !isInline && match ? (
                              <SyntaxHighlighter
                                // @ts-ignore
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {editContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-zinc-500">
            <FileText className="mb-4 h-16 w-16 text-zinc-700" />
            <p className="text-lg font-medium">No note selected</p>
            <p className="mt-1 text-sm">Select a note from the sidebar or create a new one</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreateBlank}
                className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              >
                <Plus className="h-4 w-4" />
                Blank Note
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                <LayoutTemplate className="h-4 w-4" />
                From Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        itemId={selectedNoteId || ''}
        itemType="note"
        onRestore={handleRestoreVersion}
      />
      
      <TemplateSelector
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleCreateFromTemplate}
      />
    </div>
  );
}
