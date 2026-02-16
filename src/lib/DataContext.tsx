import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Prompt, Note, Snippet, Resource } from '../types';
import { ContentTypeConfig, DEFAULT_CONTENT_TYPES } from './contentTypes';

// Import initial published data from JSON files (bundled at build time)
import publishedPrompts from '../data/prompts.json';
import publishedNotes from '../data/notes.json';
import publishedSnippets from '../data/snippets.json';
import publishedResources from '../data/resources.json';
import publishedContentTypes from '../data/content-types.json';

// Types
type ChangeType = 'added' | 'modified' | 'deleted';

interface ChangeInfo {
  type: ChangeType;
  id: string;
  title: string;
  category?: string;
}

interface DataState {
  prompts: Prompt[];
  notes: Note[];
  snippets: Snippet[];
  resources: Resource[];
  contentTypes: ContentTypeConfig[];
}

interface PublishedData {
  prompts: Prompt[];
  notes: Note[];
  snippets: Snippet[];
  resources: Resource[];
  contentTypes: ContentTypeConfig[];
}

interface Changelog {
  prompts: ChangeInfo[];
  notes: ChangeInfo[];
  snippets: ChangeInfo[];
  resources: ChangeInfo[];
  contentTypes: ChangeInfo[];
  hasChanges: boolean;
  summary: {
    added: number;
    modified: number;
    deleted: number;
  };
}

interface DataContextValue {
  // Current data (in memory)
  data: DataState;
  // Published data (from bundle)
  publishedData: PublishedData;
  // CRUD operations
  prompts: {
    getAll: () => Prompt[];
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => Prompt;
    update: (id: string, updates: Partial<Prompt>) => void;
    delete: (id: string) => void;
  };
  notes: {
    getAll: () => Note[];
    add: (item: Omit<Note, 'id' | 'updatedAt'>) => Note;
    update: (id: string, updates: Partial<Note>) => void;
    delete: (id: string) => void;
  };
  snippets: {
    getAll: () => Snippet[];
    add: (item: Omit<Snippet, 'id'>) => Snippet;
    update: (id: string, updates: Partial<Snippet>) => void;
    delete: (id: string) => void;
  };
  resources: {
    getAll: () => Resource[];
    add: (item: Omit<Resource, 'id'>) => Resource;
    update: (id: string, updates: Partial<Resource>) => void;
    delete: (id: string) => void;
  };
  contentTypes: {
    getAll: () => ContentTypeConfig[];
    add: (item: Omit<ContentTypeConfig, 'id' | 'createdAt'>) => ContentTypeConfig;
    update: (id: string, updates: Partial<ContentTypeConfig>) => void;
    delete: (id: string) => boolean;
  };
  // Changelog
  getChangelog: () => Changelog;
  // Reset to published
  resetToPublished: () => void;
  // Export for publishing
  exportForPublish: () => DataState;
}

const DataContext = createContext<DataContextValue | null>(null);

// Generate UUID without external dependency
function generateId(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// Generate content type ID from name
function generateContentTypeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const CONTENT_TYPES_STORAGE_KEY = 'pentest-hub-content-types';

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Load content types: merge defaults + published (from file) + localStorage
  const [contentTypes, setContentTypes] = useState<ContentTypeConfig[]>(() => {
    const defaultIds = DEFAULT_CONTENT_TYPES.map(t => t.id);
    
    // Start with defaults
    let merged = [...DEFAULT_CONTENT_TYPES];
    
    // Add published custom types from content-types.json
    const publishedCustom = (publishedContentTypes as ContentTypeConfig[]).filter(
      (t: ContentTypeConfig) => !defaultIds.includes(t.id)
    );
    publishedCustom.forEach((t: ContentTypeConfig) => {
      if (!merged.some(m => m.id === t.id)) {
        merged.push(t);
      }
    });
    
    // Add/override with localStorage (user's local changes take priority)
    const saved = localStorage.getItem(CONTENT_TYPES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const customTypes = parsed.filter((t: ContentTypeConfig) => !defaultIds.includes(t.id));
        customTypes.forEach((t: ContentTypeConfig) => {
          const idx = merged.findIndex(m => m.id === t.id);
          if (idx >= 0) {
            merged[idx] = t; // Override with local version
          } else {
            merged.push(t); // Add new local type
          }
        });
      } catch {
        // Ignore parse errors
      }
    }
    
    return merged;
  });

  // Save content types to localStorage
  useEffect(() => {
    localStorage.setItem(CONTENT_TYPES_STORAGE_KEY, JSON.stringify(contentTypes));
  }, [contentTypes]);

  // Current data in memory
  const [data, setData] = useState<DataState>({
    prompts: publishedPrompts as Prompt[],
    notes: publishedNotes as Note[],
    snippets: publishedSnippets as Snippet[],
    resources: publishedResources as Resource[],
    contentTypes: contentTypes,
  });

  // Published data (immutable, from bundle)
  const publishedData: PublishedData = {
    prompts: publishedPrompts as Prompt[],
    notes: publishedNotes as Note[],
    snippets: publishedSnippets as Snippet[],
    resources: publishedResources as Resource[],
    contentTypes: DEFAULT_CONTENT_TYPES, // Default types are "published"
  };

  // Prompts CRUD
  const prompts = {
    getAll: () => data.prompts,
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => {
      const newItem: Prompt = {
        ...item,
        id: generateId(),
        updatedAt: new Date().toISOString(),
      };
      setData(prev => ({ ...prev, prompts: [...prev.prompts, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Prompt>) => {
      setData(prev => ({
        ...prev,
        prompts: prev.prompts.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
    },
    delete: (id: string) => {
      setData(prev => ({
        ...prev,
        prompts: prev.prompts.filter(p => p.id !== id),
      }));
    },
  };

  // Notes CRUD
  const notes = {
    getAll: () => data.notes,
    add: (item: Omit<Note, 'id' | 'updatedAt'>) => {
      const newItem: Note = {
        ...item,
        id: generateId(),
        updatedAt: new Date().toISOString(),
      };
      setData(prev => ({ ...prev, notes: [...prev.notes, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Note>) => {
      setData(prev => ({
        ...prev,
        notes: prev.notes.map(n =>
          n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
        ),
      }));
    },
    delete: (id: string) => {
      setData(prev => ({
        ...prev,
        notes: prev.notes.filter(n => n.id !== id),
      }));
    },
  };

  // Snippets CRUD
  const snippets = {
    getAll: () => data.snippets,
    add: (item: Omit<Snippet, 'id'>) => {
      const newItem: Snippet = { ...item, id: generateId() };
      setData(prev => ({ ...prev, snippets: [...prev.snippets, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Snippet>) => {
      setData(prev => ({
        ...prev,
        snippets: prev.snippets.map(s =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    },
    delete: (id: string) => {
      setData(prev => ({
        ...prev,
        snippets: prev.snippets.filter(s => s.id !== id),
      }));
    },
  };

  // Resources CRUD
  const resources = {
    getAll: () => data.resources,
    add: (item: Omit<Resource, 'id'>) => {
      const newItem: Resource = { ...item, id: generateId() };
      setData(prev => ({ ...prev, resources: [...prev.resources, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Resource>) => {
      setData(prev => ({
        ...prev,
        resources: prev.resources.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }));
    },
    delete: (id: string) => {
      setData(prev => ({
        ...prev,
        resources: prev.resources.filter(r => r.id !== id),
      }));
    },
  };

  // Content Types CRUD
  const contentTypesApi = {
    getAll: () => data.contentTypes,
    add: (item: Omit<ContentTypeConfig, 'id' | 'createdAt'>) => {
      const newId = generateContentTypeId(item.name);
      // Ensure unique ID
      let finalId = newId;
      let counter = 1;
      while (data.contentTypes.some(t => t.id === finalId)) {
        finalId = `${newId}-${counter}`;
        counter++;
      }

      const newItem: ContentTypeConfig = {
        ...item,
        id: finalId,
        createdAt: new Date().toISOString(),
      };
      setContentTypes(prev => [...prev, newItem]);
      setData(prev => ({ ...prev, contentTypes: [...prev.contentTypes, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<ContentTypeConfig>) => {
      setContentTypes(prev => prev.map(t =>
        t.id === id ? { ...t, ...updates } : t
      ));
      setData(prev => ({
        ...prev,
        contentTypes: prev.contentTypes.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    },
    delete: (id: string) => {
      const typeToDelete = data.contentTypes.find(t => t.id === id);
      if (typeToDelete?.isDefault) {
        return false;
      }
      setContentTypes(prev => prev.filter(t => t.id !== id));
      setData(prev => ({
        ...prev,
        contentTypes: prev.contentTypes.filter(t => t.id !== id),
      }));
      return true;
    },
  };

  // Calculate changelog
  const getChangelog = useCallback((): Changelog => {
    const changes: Changelog = {
      prompts: [],
      notes: [],
      snippets: [],
      resources: [],
      contentTypes: [],
      hasChanges: false,
      summary: { added: 0, modified: 0, deleted: 0 },
    };

    // Helper to compare items
    const getItemChanges = <T extends { id: string; title?: string; name?: string; category?: string }>(
      current: T[],
      published: T[],
      _key: keyof Changelog
    ): ChangeInfo[] => {
      const result: ChangeInfo[] = [];
      const currentIds = new Set(current.map(i => i.id));
      const publishedIds = new Set(published.map(i => i.id));

      // Added items
      current.forEach(item => {
        if (!publishedIds.has(item.id)) {
          result.push({
            type: 'added',
            id: item.id,
            title: (item.title as string) || (item.name as string) || 'Untitled',
            category: item.category,
          });
          changes.summary.added++;
        }
      });

      // Deleted items
      published.forEach(item => {
        if (!currentIds.has(item.id)) {
          result.push({
            type: 'deleted',
            id: item.id,
            title: (item.title as string) || (item.name as string) || 'Untitled',
            category: item.category,
          });
          changes.summary.deleted++;
        }
      });

      // Modified items
      current.forEach(item => {
        const publishedItem = published.find(p => p.id === item.id);
        if (publishedItem && JSON.stringify(item) !== JSON.stringify(publishedItem)) {
          result.push({
            type: 'modified',
            id: item.id,
            title: (item.title as string) || (item.name as string) || 'Untitled',
            category: item.category,
          });
          changes.summary.modified++;
        }
      });

      return result;
    };

    changes.prompts = getItemChanges(data.prompts, publishedData.prompts, 'prompts');
    changes.notes = getItemChanges(data.notes, publishedData.notes, 'notes');
    changes.snippets = getItemChanges(data.snippets, publishedData.snippets, 'snippets');
    changes.resources = getItemChanges(data.resources, publishedData.resources, 'resources');
    changes.contentTypes = getItemChanges(data.contentTypes, publishedData.contentTypes, 'contentTypes');

    changes.hasChanges =
      changes.prompts.length > 0 ||
      changes.notes.length > 0 ||
      changes.snippets.length > 0 ||
      changes.resources.length > 0 ||
      changes.contentTypes.length > 0;

    return changes;
  }, [data, publishedData]);

  // Reset to published data
  const resetToPublished = useCallback(() => {
    setData({
      prompts: [...publishedData.prompts],
      notes: [...publishedData.notes],
      snippets: [...publishedData.snippets],
      resources: [...publishedData.resources],
      contentTypes: [...publishedData.contentTypes],
    });
    setContentTypes([...DEFAULT_CONTENT_TYPES]);
  }, [publishedData]);

  // Export for publishing
  const exportForPublish = useCallback(() => {
    return {
      prompts: data.prompts.map(p => ({ ...p })),
      notes: data.notes.map(n => ({ ...n })),
      snippets: data.snippets.map(s => ({ ...s })),
      resources: data.resources.map(r => ({ ...r })),
      contentTypes: data.contentTypes.map(c => ({ ...c })),
    };
  }, [data]);

  const value: DataContextValue = {
    data,
    publishedData,
    prompts,
    notes,
    snippets,
    resources,
    contentTypes: contentTypesApi,
    getChangelog,
    resetToPublished,
    exportForPublish,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Convenience hooks for each data type
export function usePrompts() {
  const { prompts } = useData();
  return prompts;
}

export function useNotes() {
  const { notes } = useData();
  return notes;
}

export function useSnippets() {
  const { snippets } = useData();
  return snippets;
}

export function useResources() {
  const { resources } = useData();
  return resources;
}

export function useContentTypesData() {
  const { contentTypes } = useData();
  return contentTypes;
}
