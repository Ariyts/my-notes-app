/**
 * Content Types Context
 * Manages dynamic content types configuration
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ContentTypeConfig,
  DEFAULT_CONTENT_TYPES,
  generateContentTypeId,
} from './contentTypes';

interface ContentTypesState {
  types: ContentTypeConfig[];
}

interface ContentTypesContextType extends ContentTypesState {
  types: ContentTypeConfig[];
  getType: (id: string) => ContentTypeConfig | undefined;
  addType: (config: Omit<ContentTypeConfig, 'id' | 'createdAt'>) => ContentTypeConfig;
  updateType: (id: string, updates: Partial<ContentTypeConfig>) => void;
  deleteType: (id: string) => boolean;
  reorderTypes: (newOrder: string[]) => void;
  exportTypes: () => string;
  importTypes: (json: string) => void;
}

const ContentTypesContext = createContext<ContentTypesContextType | null>(null);

const STORAGE_KEY = 'pentest-hub-content-types';

export function ContentTypesProvider({ children }: { children: React.ReactNode }) {
  const [types, setTypes] = useState<ContentTypeConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults (in case new default types added)
        const defaultIds = DEFAULT_CONTENT_TYPES.map(t => t.id);
        const customTypes = parsed.filter((t: ContentTypeConfig) => !defaultIds.includes(t.id));
        return [...DEFAULT_CONTENT_TYPES, ...customTypes];
      } catch {
        return DEFAULT_CONTENT_TYPES;
      }
    }
    return DEFAULT_CONTENT_TYPES;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
  }, [types]);

  const getType = useCallback((id: string) => {
    return types.find(t => t.id === id);
  }, [types]);

  const addType = useCallback((config: Omit<ContentTypeConfig, 'id' | 'createdAt'>): ContentTypeConfig => {
    const newType: ContentTypeConfig = {
      ...config,
      id: generateContentTypeId(config.name),
      createdAt: new Date().toISOString(),
    };

    // Ensure ID is unique
    let finalId = newType.id;
    let counter = 1;
    while (types.some(t => t.id === finalId)) {
      finalId = `${newType.id}-${counter}`;
      counter++;
    }
    newType.id = finalId;

    setTypes(prev => [...prev, newType]);
    return newType;
  }, [types]);

  const updateType = useCallback((id: string, updates: Partial<ContentTypeConfig>) => {
    setTypes(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  const deleteType = useCallback((id: string): boolean => {
    const typeToDelete = types.find(t => t.id === id);
    if (typeToDelete?.isDefault) {
      return false; // Can't delete default types
    }

    setTypes(prev => prev.filter(t => t.id !== id));
    return true;
  }, [types]);

  const reorderTypes = useCallback((newOrder: string[]) => {
    setTypes(prev => {
      const typeMap = new Map(prev.map(t => [t.id, t]));
      return newOrder
        .map(id => typeMap.get(id))
        .filter((t): t is ContentTypeConfig => t !== undefined);
    });
  }, []);

  const exportTypes = useCallback(() => {
    return JSON.stringify(types, null, 2);
  }, [types]);

  const importTypes = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as ContentTypeConfig[];
      if (Array.isArray(imported)) {
        // Keep default types, add/update from import
        setTypes(prev => {
          const defaultTypes = prev.filter(t => t.isDefault);
          const customTypes = imported.filter(t => !t.isDefault);
          return [...defaultTypes, ...customTypes];
        });
      }
    } catch (e) {
      console.error('Failed to import content types:', e);
    }
  }, []);

  return (
    <ContentTypesContext.Provider
      value={{
        types,
        getType,
        addType,
        updateType,
        deleteType,
        reorderTypes,
        exportTypes,
        importTypes,
      }}
    >
      {children}
    </ContentTypesContext.Provider>
  );
}

export function useContentTypes() {
  const context = useContext(ContentTypesContext);
  if (!context) {
    throw new Error('useContentTypes must be used within ContentTypesProvider');
  }
  return context;
}
