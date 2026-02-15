import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Plus, Search, Trash2, FileText, Folder, FolderOpen,
  Edit3, Eye, ChevronRight, ChevronDown, Copy, Check, Columns,
  FileCode, LayoutTemplate, Download, Upload, Archive, FileDown, FileUp,
  FolderPlus, X
} from 'lucide-react';
import { useData } from '../lib/DataContext';
import { Note } from '../types';
import { cn } from '../utils/cn';
import { TemplateSelector } from '../components/TemplateSelector';
import { NoteTemplate } from '../lib/templates';
import { 
  createNotesArchive, 
  importNotesFromFiles, 
  importNotesFromZip,
  noteToMarkdown,
  getNoteFilename
} from '../lib/obsidianSync';

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
  const { notes: notesApi, data } = useData();
  const notes = data.notes;
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'split'>('split');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  
  // Modal
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Form state for editing
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Import/Export
  const [showImportExport, setShowImportExport] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with first note and expand folders
  useEffect(() => {
    if (notes.length > 0 && !selectedNoteId) {
      const roots = new Set(notes.map(n => n.category.split('/')[0]));
      setExpandedFolders(roots);
      selectNote(notes[0]);
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
    const newNote = notesApi.add({
      title: template.name,
      category: template.category,
      content: template.content,
      tags: []
    });
    selectNote(newNote);
    setViewMode('edit');
    setShowTemplates(false);
  };

  const handleCreateBlank = (category?: string) => {
    const newNote = notesApi.add({
      title: 'Untitled Note',
      category: category || 'Methodology/General',
      content: '# New Note\n\nStart writing your notes here...\n\n## Example Section\n\n```bash\necho "Hello World"\n```',
      tags: []
    });
    selectNote(newNote);
    setViewMode('edit');
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    // Create a placeholder note to establish the folder
    const folderPath = newFolderName.trim();
    const newNote = notesApi.add({
      title: 'Welcome to ' + folderPath,
      category: folderPath,
      content: `# Welcome to ${folderPath}\n\nThis is a new folder. Start organizing your notes here!`,
      tags: []
    });
    selectNote(newNote);
    setExpandedFolders(prev => new Set([...prev, folderPath.split('/')[0]]));
    setNewFolderName('');
    setShowNewFolder(false);
    setViewMode('edit');
  };

  const handleFolderClick = (folderPath: string) => {
    // Create note directly in this folder
    handleCreateBlank(folderPath);
  };

  const handleSave = useCallback(() => {
    if (!selectedNoteId) return;
    
    notesApi.update(selectedNoteId, {
      title: editTitle,
      category: editCategory,
      content: editContent,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
    });
    
    setHasUnsaved(false);
  }, [selectedNoteId, editTitle, editCategory, editContent, editTags, notesApi]);

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
    if (!selectedNoteId || !confirm('Delete this note?')) return;
    
    notesApi.delete(selectedNoteId);
    
    const remainingNotes = notes.filter(n => n.id !== selectedNoteId);
    if (remainingNotes.length > 0) {
      selectNote(remainingNotes[0]);
    } else {
      setSelectedNoteId(null);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(editContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export all notes as ZIP (Obsidian format)
  const handleExportAll = async () => {
    if (notes.length === 0) {
      setImportStatus('No notes to export');
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    try {
      const blob = await createNotesArchive(notes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-obsidian-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setImportStatus(`Exported ${notes.length} notes`);
    } catch (error) {
      setImportStatus('Export failed');
    }
    setTimeout(() => setImportStatus(null), 3000);
  };

  // Export single note as .md
  const handleExportCurrent = () => {
    if (!selectedNote) return;

    const content = noteToMarkdown(selectedNote);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getNoteFilename(selectedNote);
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import notes from files or ZIP
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      let importedNotes: Partial<Note>[] = [];

      // Check if it's a ZIP file
      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        setImportStatus('Importing from ZIP...');
        importedNotes = await importNotesFromZip(files[0]);
      } else {
        setImportStatus(`Importing ${files.length} file(s)...`);
        importedNotes = await importNotesFromFiles(files);
      }

      // Add imported notes
      let added = 0;
      for (const note of importedNotes) {
        if (note.title && note.content) {
          notesApi.add({
            title: note.title,
            category: note.category || 'Imported',
            content: note.content,
            tags: note.tags || [],
          });
          added++;
        }
      }

      setImportStatus(`Imported ${added} note(s)`);
    } catch (error) {
      setImportStatus('Import failed');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => setImportStatus(null), 3000);
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

  const filteredNotes = useMemo(() => 
    notes.filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.category.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    ), [notes, search]
  );

  // Get all existing folders from notes
  const existingFolders = useMemo(() => {
    const folders = new Set<string>();
    notes.forEach(note => {
      folders.add(note.category);
    });
    return Array.from(folders).sort();
  }, [notes]);

  // Build tree structure
  const tree = useMemo(() => {
    const treeObj: Record<string, Record<string, Note[]>> = {};
    
    filteredNotes.forEach(note => {
      const parts = note.category.split('/');
      const root = parts[0] || 'Uncategorized';
      const sub = parts.slice(1).join('/') || '_root';
      
      if (!treeObj[root]) treeObj[root] = {};
      if (!treeObj[root][sub]) treeObj[root][sub] = [];
      treeObj[root][sub].push(note);
    });
    
    return treeObj;
  }, [filteredNotes]);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sidebar Tree */}
      <div className="flex w-72 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="border-b border-zinc-800 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">Notes</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowImportExport(!showImportExport)}
                className={cn(
                  "rounded-lg p-1.5 text-zinc-300 hover:bg-zinc-600",
                  showImportExport && "bg-zinc-600"
                )}
                title="Import/Export"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setShowNewFolder(true)}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleCreateBlank()}
                className="rounded-lg bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600"
                title="New Note"
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

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="mb-3 rounded-lg bg-zinc-800/50 p-3">
              <div className="text-xs font-medium text-zinc-400 mb-2">Create New Folder</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Folder name (e.g., Web/XSS)"
                  className="flex-1 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                  className="rounded bg-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1.5">
                Use / for subfolders: e.g., "Web/XSS" or "Cloud/AWS"
              </div>
            </div>
          )}

          {/* Import/Export Panel */}
          {showImportExport && (
            <div className="mb-3 rounded-lg bg-zinc-800/50 p-3 space-y-2">
              <div className="text-xs font-medium text-zinc-400 mb-2">Obsidian Sync</div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleExportAll}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export ZIP
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-600/30 cursor-pointer">
                  <FileUp className="h-3.5 w-3.5" />
                  Import
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.zip"
                    multiple
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </div>

              {selectedNote && (
                <button
                  onClick={handleExportCurrent}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Current Note
                </button>
              )}

              {importStatus && (
                <div className="text-xs text-center text-zinc-400 py-1">
                  {importStatus}
                </div>
              )}

              <div className="text-[10px] text-zinc-500 text-center">
                Compatible with Obsidian vaults
              </div>
            </div>
          )}

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
              <div className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 group">
                <button
                  onClick={() => toggleFolder(rootCategory)}
                  className="flex items-center gap-2 flex-1"
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
                </button>
                <span className="text-xs text-zinc-600 mr-1">
                  {Object.values(subCategories).flat().length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFolderClick(rootCategory); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-emerald-400 hover:bg-emerald-500/20 transition-opacity"
                  title="Add note to this folder"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {expandedFolders.has(rootCategory) && (
                <div className="ml-3 border-l border-zinc-800 pl-2">
                  {Object.entries(subCategories).sort().map(([subCategory, categoryNotes]) => (
                    <div key={subCategory} className="mt-1">
                      {subCategory !== '_root' && (
                        <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-500 group">
                          <Folder className="h-3 w-3 text-amber-500/50" />
                          <span className="flex-1">{subCategory}</span>
                          <button
                            onClick={() => handleFolderClick(`${rootCategory}/${subCategory}`)}
                            className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-emerald-400 hover:bg-emerald-500/20 transition-opacity"
                            title="Add note to this subfolder"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
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
                <span className="text-zinc-500">Folder:</span>
                <select
                  value={editCategory}
                  onChange={(e) => { setEditCategory(e.target.value); setHasUnsaved(true); }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select folder...</option>
                  {existingFolders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
                <input
                  value={editCategory}
                  onChange={(e) => { setEditCategory(e.target.value); setHasUnsaved(true); }}
                  className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="or type new folder (e.g., Web/XSS)"
                  list="categories"
                />
                <datalist id="categories">
                  {[...PREDEFINED_CATEGORIES, ...existingFolders].map(cat => (
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
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </button>
              <button
                onClick={() => handleCreateBlank()}
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
      <TemplateSelector
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleCreateFromTemplate}
      />
    </div>
  );
}
