/**
 * Folders View
 * 
 * Displays items in a hierarchical folder structure with markdown editor.
 * Used for Notes and similar hierarchical content.
 */

import { useState, useMemo } from 'react';
import { Section, SectionItem } from '../../types/sections';
import { FolderView, FolderItem } from '../shared/FolderView';

interface FoldersViewProps {
  section: Section;
  items: SectionItem[];
  onItemsChange: (items: SectionItem[]) => void;
}

export function FoldersView({ section, items, onItemsChange }: FoldersViewProps) {
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [editData, setEditData] = useState<FolderItem>({
    id: '',
    title: '',
    category: '',
    content: '',
    tags: [],
  });
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Convert SectionItems to FolderItems
  const folderItems: FolderItem[] = useMemo(() => 
    items.map(item => ({
      id: item.id,
      title: String(item.data.title || ''),
      category: String(item.data.category || 'General'),
      content: String(item.data.content || ''),
      tags: item.tags,
      updatedAt: item.updatedAt,
    })),
    [items]
  );

  // Get categories (root folders)
  const categories = useMemo(() => {
    const roots = new Set<string>();
    items.forEach(item => {
      const cat = String(item.data.category || '');
      if (cat.includes('/')) {
        roots.add(cat.split('/')[0]);
      } else if (cat) {
        roots.add(cat);
      }
    });
    return [...roots].sort();
  }, [items]);

  // Handlers
  const handleSelect = (item: FolderItem) => {
    if (hasUnsaved && !confirm('Discard unsaved changes?')) return;
    setSelectedItem(item);
    setEditData({ ...item });
    setHasUnsaved(false);
  };

  const handleCreate = (category?: string) => {
    const newItem: SectionItem = {
      id: `id-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`,
      sectionId: section.id,
      data: {
        title: 'Untitled Note',
        category: category || 'General',
        content: '# New Note\n\nStart writing your notes here...',
      },
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    onItemsChange([...items, newItem]);
    
    const folderItem: FolderItem = {
      id: newItem.id,
      title: String(newItem.data.title),
      category: String(newItem.data.category),
      content: String(newItem.data.content),
      tags: newItem.tags,
      updatedAt: newItem.updatedAt,
    };
    setSelectedItem(folderItem);
    setEditData(folderItem);
    setHasUnsaved(false);
  };

  const handleCreateFolder = (folderName: string) => {
    const newItem: SectionItem = {
      id: `id-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`,
      sectionId: section.id,
      data: {
        title: `Welcome to ${folderName}`,
        category: folderName,
        content: `# Welcome to ${folderName}\n\nThis is a new folder. Start organizing your notes here!`,
      },
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    onItemsChange([...items, newItem]);
    
    const folderItem: FolderItem = {
      id: newItem.id,
      title: String(newItem.data.title),
      category: String(newItem.data.category),
      content: String(newItem.data.content),
      tags: newItem.tags,
      updatedAt: newItem.updatedAt,
    };
    setSelectedItem(folderItem);
    setEditData(folderItem);
    setHasUnsaved(false);
  };

  const handleUpdate = (id: string, data: Partial<FolderItem>) => {
    onItemsChange(items.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        data: {
          ...item.data,
          ...(data.title !== undefined && { title: data.title }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.content !== undefined && { content: data.content }),
        },
        tags: data.tags ?? item.tags,
        updatedAt: new Date().toISOString(),
      };
    }));

    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, ...data } : null);
      setEditData(prev => ({ ...prev, ...data }));
    }
  };

  const handleDelete = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
    if (selectedItem?.id === id) {
      const remaining = items.filter(item => item.id !== id);
      if (remaining.length > 0) {
        const next = remaining[0];
        const folderItem: FolderItem = {
          id: next.id,
          title: String(next.data.title || ''),
          category: String(next.data.category || ''),
          content: String(next.data.content || ''),
          tags: next.tags,
          updatedAt: next.updatedAt,
        };
        setSelectedItem(folderItem);
        setEditData(folderItem);
      } else {
        setSelectedItem(null);
      }
    }
  };

  const handleRenameFolder = (oldPath: string, newPath: string) => {
    onItemsChange(items.map(item => {
      const cat = String(item.data.category || '');
      if (cat === oldPath) {
        return { ...item, data: { ...item.data, category: newPath } };
      } else if (cat.startsWith(oldPath + '/')) {
        return { ...item, data: { ...item.data, category: cat.replace(oldPath + '/', newPath + '/') } };
      }
      return item;
    }));

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

  const handleDeleteFolder = (folderPath: string) => {
    const remaining = items.filter(item => {
      const cat = String(item.data.category || '');
      return cat !== folderPath && !cat.startsWith(folderPath + '/');
    });
    onItemsChange(remaining);

    if (selectedItem) {
      const selCat = selectedItem.category;
      if (selCat === folderPath || selCat.startsWith(folderPath + '/')) {
        if (remaining.length > 0) {
          const next = remaining[0];
          const folderItem: FolderItem = {
            id: next.id,
            title: String(next.data.title || ''),
            category: String(next.data.category || ''),
            content: String(next.data.content || ''),
            tags: next.tags,
            updatedAt: next.updatedAt,
          };
          setSelectedItem(folderItem);
          setEditData(folderItem);
        } else {
          setSelectedItem(null);
        }
      }
    }
  };

  // Templates
  const templates = [
    { name: 'Blank Note', category: 'General', content: '# New Note\n\nStart writing your notes here...\n\n## Example Section\n\n```bash\necho "Hello World"\n```' },
    { name: 'Meeting Notes', category: 'General', content: '# Meeting\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n- \n\n## Notes\n\n- \n\n## Action Items\n\n- [ ] ' },
    { name: 'Research', category: 'General', content: '# Research Topic\n\n## Overview\n\n## Key Points\n\n- \n\n## References\n\n- ' },
  ];

  const handleSelectTemplate = (template: { name: string; category: string; content: string }) => {
    const newItem: SectionItem = {
      id: `id-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`,
      sectionId: section.id,
      data: {
        title: template.name,
        category: template.category,
        content: template.content,
      },
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    onItemsChange([...items, newItem]);
    
    const folderItem: FolderItem = {
      id: newItem.id,
      title: String(newItem.data.title),
      category: String(newItem.data.category),
      content: String(newItem.data.content),
      tags: newItem.tags,
      updatedAt: newItem.updatedAt,
    };
    setSelectedItem(folderItem);
    setEditData(folderItem);
    setHasUnsaved(false);
  };

  return (
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
      onExportAll={async () => {}}
      onImport={async () => {}}
      onExportCurrent={() => {}}
      title={section.name}
      predefinedCategories={section.config?.predefinedCategories}
      showTemplates={true}
      templates={templates}
      onSelectTemplate={handleSelectTemplate}
      editData={editData}
      setEditData={setEditData}
      hasUnsaved={hasUnsaved}
      setHasUnsaved={setHasUnsaved}
    />
  );
}
