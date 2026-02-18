/**
 * Sections Context
 * 
 * Provides section management and data access throughout the application.
 * Replaces the old DataContext for section-based content.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Section, SectionItem } from '../types/sections';
import { universalStorage } from './universal-storage';

interface SectionsContextValue {
  // Sections
  sections: Section[];
  addSection: (section: Omit<Section, 'order' | 'createdAt'>) => Section;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => boolean;
  reorderSections: (orderedIds: string[]) => void;
  
  // Data
  getSectionData: (sectionId: string) => SectionItem[];
  setSectionData: (sectionId: string, items: SectionItem[]) => void;
  addItem: (sectionId: string, data: Record<string, unknown>, tags?: string[]) => SectionItem;
  updateItem: (sectionId: string, id: string, updates: Partial<Pick<SectionItem, 'data' | 'tags'>>) => void;
  deleteItem: (sectionId: string, id: string) => void;
  
  // Export/Import
  exportAll: () => { sections: Section[]; data: Record<string, SectionItem[]> };
  importAll: (data: { sections: Section[]; data: Record<string, SectionItem[]> }) => void;
  clearAll: () => void;
}

const SectionsContext = createContext<SectionsContextValue | null>(null);

export function SectionsProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<Section[]>(() => universalStorage.getSections());
  const [dataCache, setDataCache] = useState<Record<string, SectionItem[]>>({});

  // Save sections when changed
  useEffect(() => {
    universalStorage.saveSections(sections);
  }, [sections]);

  // Load data for a section when needed
  const getSectionData = useCallback((sectionId: string): SectionItem[] => {
    if (!dataCache[sectionId]) {
      const data = universalStorage.getItems(sectionId);
      setDataCache(prev => ({ ...prev, [sectionId]: data }));
      return data;
    }
    return dataCache[sectionId];
  }, [dataCache]);

  const setSectionData = useCallback((sectionId: string, items: SectionItem[]) => {
    universalStorage.setItems(sectionId, items);
    setDataCache(prev => ({ ...prev, [sectionId]: items }));
  }, []);

  // Section CRUD
  const addSection = useCallback((section: Omit<Section, 'order' | 'createdAt'>): Section => {
    const newSection = universalStorage.addSection(section);
    setSections(prev => [...prev, newSection].sort((a, b) => a.order - b.order));
    return newSection;
  }, []);

  const updateSection = useCallback((id: string, updates: Partial<Section>) => {
    universalStorage.updateSection(id, updates);
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSection = useCallback((id: string): boolean => {
    const result = universalStorage.deleteSection(id);
    if (result) {
      setSections(prev => prev.filter(s => s.id !== id));
      setDataCache(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    return result;
  }, []);

  const reorderSections = useCallback((orderedIds: string[]) => {
    universalStorage.reorderSections(orderedIds);
    setSections(prev => 
      orderedIds.map((id, index) => {
        const section = prev.find(s => s.id === id);
        return section ? { ...section, order: index } : null;
      }).filter(Boolean) as Section[]
    );
  }, []);

  // Item CRUD
  const addItem = useCallback((sectionId: string, data: Record<string, unknown>, tags: string[] = []): SectionItem => {
    const item = universalStorage.addItem(sectionId, data, tags);
    setDataCache(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), item],
    }));
    return item;
  }, []);

  const updateItem = useCallback((sectionId: string, id: string, updates: Partial<Pick<SectionItem, 'data' | 'tags'>>) => {
    universalStorage.updateItem(sectionId, id, updates);
    setDataCache(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).map(item =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    }));
  }, []);

  const deleteItem = useCallback((sectionId: string, id: string) => {
    universalStorage.deleteItem(sectionId, id);
    setDataCache(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).filter(item => item.id !== id),
    }));
  }, []);

  // Export/Import
  const exportAll = useCallback(() => universalStorage.exportAll(), []);
  const importAll = useCallback((data: { sections: Section[]; data: Record<string, SectionItem[]> }) => {
    universalStorage.importAll(data);
    setSections(data.sections);
    setDataCache(data.data);
  }, []);
  const clearAll = useCallback(() => {
    universalStorage.clearAll();
    setSections([]);
    setDataCache({});
  }, []);

  const value: SectionsContextValue = {
    sections,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    getSectionData,
    setSectionData,
    addItem,
    updateItem,
    deleteItem,
    exportAll,
    importAll,
    clearAll,
  };

  return (
    <SectionsContext.Provider value={value}>
      {children}
    </SectionsContext.Provider>
  );
}

export function useSections(): SectionsContextValue {
  const context = useContext(SectionsContext);
  if (!context) {
    throw new Error('useSections must be used within a SectionsProvider');
  }
  return context;
}

// Convenience hook for a single section
export function useSection(sectionId: string) {
  const { sections, getSectionData, setSectionData, addItem, updateItem, deleteItem } = useSections();
  
  const section = sections.find(s => s.id === sectionId);
  const items = getSectionData(sectionId);

  const setItems = useCallback((newItems: SectionItem[]) => {
    setSectionData(sectionId, newItems);
  }, [sectionId, setSectionData]);

  return {
    section,
    items,
    setItems,
    addItem: (data: Record<string, unknown>, tags?: string[]) => addItem(sectionId, data, tags),
    updateItem: (id: string, updates: Partial<Pick<SectionItem, 'data' | 'tags'>>) => updateItem(sectionId, id, updates),
    deleteItem: (id: string) => deleteItem(sectionId, id),
  };
}
