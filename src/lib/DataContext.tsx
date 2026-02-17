/**
 * Data Context (Legacy Compatibility Layer)
 * 
 * Provides backward compatibility for components that still use the old API.
 * New code should use SectionsContext instead.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Prompt, Note, Snippet, Resource } from '../types';
import { ContentTypeConfig, DEFAULT_CONTENT_TYPES } from './contentTypes';

// Import initial published data from JSON files
import publishedPrompts from '../data/prompts.json';
import publishedNotes from '../data/notes.json';
import publishedSnippets from '../data/snippets.json';
import publishedResources from '../data/resources.json';

interface DataState {
  prompts: Prompt[];
  notes: Note[];
  snippets: Snippet[];
  resources: Resource[];
  contentTypes: ContentTypeConfig[];
}

interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted';
  id: string;
  title: string;
  category?: string;
}

interface Changelog {
  hasChanges: boolean;
  summary: { added: number; modified: number; deleted: number };
  prompts: ChangeInfo[];
  notes: ChangeInfo[];
  snippets: ChangeInfo[];
  resources: ChangeInfo[];
  contentTypes: ChangeInfo[];
}

interface DataContextValue {
  data: DataState;
  publishedData: DataState;
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
  getChangelog: () => Changelog;
  resetToPublished: () => void;
  exportForPublish: () => DataState;
}

const DataContext = createContext<DataContextValue | null>(null);

function generateId(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

const CONTENT_TYPES_STORAGE_KEY = 'pentest-hub-content-types';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [contentTypes, setContentTypes] = useState<ContentTypeConfig[]>(() => {
    const saved = localStorage.getItem(CONTENT_TYPES_STORAGE_KEY);
    if (saved) {
      try {
        return [...DEFAULT_CONTENT_TYPES, ...JSON.parse(saved).filter((t: ContentTypeConfig) => !DEFAULT_CONTENT_TYPES.find(d => d.id === t.id))];
      } catch {
        return DEFAULT_CONTENT_TYPES;
      }
    }
    return DEFAULT_CONTENT_TYPES;
  });

  const [data, setData] = useState<DataState>({
    prompts: publishedPrompts as Prompt[],
    notes: publishedNotes as Note[],
    snippets: publishedSnippets as Snippet[],
    resources: publishedResources as Resource[],
    contentTypes,
  });

  const publishedData: DataState = {
    prompts: publishedPrompts as Prompt[],
    notes: publishedNotes as Note[],
    snippets: publishedSnippets as Snippet[],
    resources: publishedResources as Resource[],
    contentTypes: DEFAULT_CONTENT_TYPES,
  };

  useEffect(() => {
    localStorage.setItem(CONTENT_TYPES_STORAGE_KEY, JSON.stringify(contentTypes.filter(t => !t.isDefault)));
  }, [contentTypes]);

  const prompts = {
    getAll: () => data.prompts,
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => {
      const newItem: Prompt = { ...item, id: generateId(), updatedAt: new Date().toISOString() };
      setData(prev => ({ ...prev, prompts: [...prev.prompts, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Prompt>) => {
      setData(prev => ({ ...prev, prompts: prev.prompts.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p) }));
    },
    delete: (id: string) => {
      setData(prev => ({ ...prev, prompts: prev.prompts.filter(p => p.id !== id) }));
    },
  };

  const notes = {
    getAll: () => data.notes,
    add: (item: Omit<Note, 'id' | 'updatedAt'>) => {
      const newItem: Note = { ...item, id: generateId(), updatedAt: new Date().toISOString() };
      setData(prev => ({ ...prev, notes: [...prev.notes, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Note>) => {
      setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n) }));
    },
    delete: (id: string) => {
      setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
    },
  };

  const snippets = {
    getAll: () => data.snippets,
    add: (item: Omit<Snippet, 'id'>) => {
      const newItem: Snippet = { ...item, id: generateId() };
      setData(prev => ({ ...prev, snippets: [...prev.snippets, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Snippet>) => {
      setData(prev => ({ ...prev, snippets: prev.snippets.map(s => s.id === id ? { ...s, ...updates } : s) }));
    },
    delete: (id: string) => {
      setData(prev => ({ ...prev, snippets: prev.snippets.filter(s => s.id !== id) }));
    },
  };

  const resources = {
    getAll: () => data.resources,
    add: (item: Omit<Resource, 'id'>) => {
      const newItem: Resource = { ...item, id: generateId() };
      setData(prev => ({ ...prev, resources: [...prev.resources, newItem] }));
      return newItem;
    },
    update: (id: string, updates: Partial<Resource>) => {
      setData(prev => ({ ...prev, resources: prev.resources.map(r => r.id === id ? { ...r, ...updates } : r) }));
    },
    delete: (id: string) => {
      setData(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== id) }));
    },
  };

  const contentTypesApi = {
    getAll: () => contentTypes,
    add: (item: Omit<ContentTypeConfig, 'id' | 'createdAt'>) => {
      const newItem: ContentTypeConfig = { ...item, id: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), createdAt: new Date().toISOString() };
      setContentTypes(prev => [...prev, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<ContentTypeConfig>) => {
      setContentTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    },
    delete: (id: string) => {
      const type = contentTypes.find(t => t.id === id);
      if (type?.isDefault) return false;
      setContentTypes(prev => prev.filter(t => t.id !== id));
      return true;
    },
  };

  const value: DataContextValue = {
    data,
    publishedData,
    prompts,
    notes,
    snippets,
    resources,
    contentTypes: contentTypesApi,
    getChangelog: () => ({ 
      hasChanges: false, 
      summary: { added: 0, modified: 0, deleted: 0 },
      prompts: [],
      notes: [],
      snippets: [],
      resources: [],
      contentTypes: [],
    }),
    resetToPublished: () => setData({ prompts: publishedPrompts as Prompt[], notes: publishedNotes as Note[], snippets: publishedSnippets as Snippet[], resources: publishedResources as Resource[], contentTypes: DEFAULT_CONTENT_TYPES }),
    exportForPublish: () => data,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}

export function usePrompts() { return useData().prompts; }
export function useNotes() { return useData().notes; }
export function useSnippets() { return useData().snippets; }
export function useResources() { return useData().resources; }
export function useContentTypesData() { return useData().contentTypes; }
