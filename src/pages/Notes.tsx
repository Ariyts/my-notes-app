import { useState, useEffect, useCallback, useRef } from 'react';
import { useData } from '../lib/DataContext';
import { Note } from '../types';
import { TemplateSelector } from '../components/TemplateSelector';
import { NoteTemplate } from '../lib/templates';
import { 
  createNotesArchive, 
  importNotesFromFiles, 
  importNotesFromZip,
  noteToMarkdown,
  getNoteFilename
} from '../lib/obsidianSync';
import { FolderView, FolderItem } from '../components/shared/FolderView';

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
  
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editData, setEditData] = useState<FolderItem>({
    id: '',
    title: '',
    category: '',
    content: '',
    tags: [],
  });
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert notes to FolderItems
  const folderItems: FolderItem[] = notes.map(n => ({
    id: n.id,
    title: n.title,
    category: n.category,
    content: n.content,
    tags: n.tags,
    updatedAt: n.updatedAt,
  }));

  // Categories from notes
  const categories = [...new Set(notes.map(n => n.category.split('/')[0]))].sort();

  // Templates
  const templates: { name: string; category: string; content: string }[] = [
    { name: 'Blank Note', category: 'Methodology/General', content: '# New Note\n\nStart writing your notes here...\n\n## Example Section\n\n```bash\necho "Hello World"\n```' },
    { name: 'Meeting Notes', category: 'Methodology/General', content: '# Meeting\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n- \n\n## Notes\n\n- \n\n## Action Items\n\n- [ ] ' },
    { name: 'Research', category: 'Methodology/General', content: '# Research Topic\n\n## Overview\n\n## Key Points\n\n- \n\n## References\n\n- ' },
  ];

  // Handlers
  const handleSelect = (item: FolderItem) => {
    if (hasUnsaved && !confirm('Discard unsaved changes?')) return;
    setSelectedItem(item);
    setEditData({ ...item });
    setHasUnsaved(false);
  };

  const handleCreate = (category?: string) => {
    const newNote = notesApi.add({
      title: 'Untitled Note',
      category: category || 'Methodology/General',
      content: '# New Note\n\nStart writing your notes here...\n\n## Example Section\n\n```bash\necho "Hello World"\n```',
      tags: []
    });
    const folderItem: FolderItem = {
      id: newNote.id,
      title: newNote.title,
      category: newNote.category,
      content: newNote.content,
      tags: newNote.tags,
      updatedAt: newNote.updatedAt,
    };
    setSelectedItem(folderItem);
    setEditData(folderItem);
    setHasUnsaved(false);
  };

  const handleCreateFolder = (folderName: string) => {
    const newNote = notesApi.add({
      title: 'Welcome to ' + folderName,
      category: folderName,
      content: `# Welcome to ${folderName}\n\nThis is a new folder. Start organizing your notes here!`,
      tags: []
    });
    const folderItem: FolderItem = {
      id: newNote.id,
      title: newNote.title,
      category: newNote.category,
      content: newNote.content,
      tags: newNote.tags,
      updatedAt: newNote.updatedAt,
    };
    setSelectedItem(folderItem);
    setEditData(folderItem);
    setHasUnsaved(false);
  };

  const handleUpdate = (id: string, data: Partial<FolderItem>) => {
    // Only update fields that were actually provided
    const updates: Partial<Note> = { ...data };
    
    notesApi.update(id, updates);
    
    // Update local state if this is the selected item
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, ...data } : null);
      setEditData(prev => ({ ...prev, ...data }));
    }
  };

  const handleDelete = (id: string) => {
    notesApi.delete(id);
    if (selectedItem?.id === id) {
      const remainingNotes = notes.filter(n => n.id !== id);
      if (remainingNotes.length > 0) {
        const nextNote = remainingNotes[0];
        const folderItem: FolderItem = {
          id: nextNote.id,
          title: nextNote.title,
          category: nextNote.category,
          content: nextNote.content,
          tags: nextNote.tags,
          updatedAt: nextNote.updatedAt,
        };
        setSelectedItem(folderItem);
        setEditData(folderItem);
      } else {
        setSelectedItem(null);
      }
    }
  };

  // Atomic folder rename - updates all notes in folder at once
  const handleRenameFolder = (oldPath: string, newPath: string) => {
    notes.forEach(note => {
      if (note.category === oldPath) {
        notesApi.update(note.id, { category: newPath });
      } else if (note.category.startsWith(oldPath + '/')) {
        notesApi.update(note.id, { category: note.category.replace(oldPath + '/', newPath + '/') });
      }
    });

    // Update selected item state if it was in renamed folder
    if (selectedItem) {
      const selCat = selectedItem.category;
      if (selCat === oldPath) {
        setSelectedItem(prev => prev ? { ...prev, category: newPath } : null);
        setEditData(prev => ({ ...prev, category: newPath }));
      } else if (selCat.startsWith(oldPath + '/')) {
        const newCat = selCat.replace(oldPath + '/', newPath + '/');
        setSelectedItem(prev => prev ? { ...prev, category: newCat } : null);
        setEditData(prev => ({ ...prev, category: newCat }));
      }
    }
  };

  // Delete folder with all its notes
  const handleDeleteFolder = (folderPath: string) => {
    notes.forEach(note => {
      if (note.category === folderPath || note.category.startsWith(folderPath + '/')) {
        notesApi.delete(note.id);
      }
    });

    // Clear selection if deleted folder contained selected item
    if (selectedItem) {
      const selCat = selectedItem.category;
      if (selCat === folderPath || selCat.startsWith(folderPath + '/')) {
        const remainingNotes = notes.filter(n => 
          n.category !== folderPath && !n.category.startsWith(folderPath + '/')
        );
        if (remainingNotes.length > 0) {
          const nextNote = remainingNotes[0];
          const folderItem: FolderItem = {
            id: nextNote.id,
            title: nextNote.title,
            category: nextNote.category,
            content: nextNote.content,
            tags: nextNote.tags,
            updatedAt: nextNote.updatedAt,
          };
          setSelectedItem(folderItem);
          setEditData(folderItem);
        } else {
          setSelectedItem(null);
        }
      }
    }
  };

  const handleExportAll = async () => {
    if (notes.length === 0) return;
    const blob = await createNotesArchive(notes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-obsidian-${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (files: FileList) => {
    try {
      let importedNotes: Partial<Note>[] = [];

      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        importedNotes = await importNotesFromZip(files[0]);
      } else {
        importedNotes = await importNotesFromFiles(files);
      }

      for (const note of importedNotes) {
        if (note.title && note.content) {
          notesApi.add({
            title: note.title,
            category: note.category || 'Imported',
            content: note.content,
            tags: note.tags || [],
          });
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleExportCurrent = () => {
    if (!selectedItem) return;
    const note = notes.find(n => n.id === selectedItem.id);
    if (!note) return;
    
    const content = noteToMarkdown(note);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getNoteFilename(note);
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectTemplate = (template: { name: string; category: string; content: string }) => {
    const newNote = notesApi.add({
      title: template.name,
      category: template.category,
      content: template.content,
      tags: []
    });
    const folderItem: FolderItem = {
      id: newNote.id,
      title: newNote.title,
      category: newNote.category,
      content: newNote.content,
      tags: newNote.tags,
      updatedAt: newNote.updatedAt,
    };
    setSelectedItem(folderItem);
    setEditData(folderItem);
    setHasUnsaved(false);
    setShowTemplates(false);
  };

  return (
    <>
      <FolderView
        items={folderItems}
        categories={categories}
        selectedItem={selectedItem}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onCreateFolder={handleCreateFolder}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
        onExportAll={handleExportAll}
        onImport={handleImport}
        onExportCurrent={handleExportCurrent}
        title="Notes"
        predefinedCategories={PREDEFINED_CATEGORIES}
        showTemplates={true}
        templates={templates}
        onSelectTemplate={handleSelectTemplate}
        editData={editData}
        setEditData={setEditData}
        hasUnsaved={hasUnsaved}
        setHasUnsaved={setHasUnsaved}
      />

      <TemplateSelector
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleSelectTemplate}
      />
    </>
  );
}
