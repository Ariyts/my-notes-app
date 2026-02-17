/**
 * Workspace Context
 * 
 * Provides workspace management and filtering throughout the application.
 * Workspaces are the top-level container for sections.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workspace, Section, SectionItem } from '../types/sections';

// Storage keys
const WORKSPACES_KEY = 'pentest-hub-workspaces';
const ACTIVE_WORKSPACE_KEY = 'pentest-hub-active-workspace';
const SECTIONS_KEY = 'pentest-hub-sections';

// Default workspace colors
export const WORKSPACE_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

// Default workspace
const DEFAULT_WORKSPACE: Workspace = {
  id: 'default',
  name: 'Pentest',
  color: '#ef4444',
  icon: 'Shield',
  isDefault: true,
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Context value interface
interface WorkspaceContextValue {
  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  addWorkspace: (workspace: Omit<Workspace, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => boolean;
  reorderWorkspaces: (orderedIds: string[]) => void;
  duplicateWorkspace: (id: string, name: string) => Workspace | null;
  
  // Sections (filtered by active workspace)
  sections: Section[];
  allSections: Section[];
  addSection: (section: Omit<Section, 'workspaceId' | 'order' | 'createdAt'>) => Section;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => boolean;
  reorderSections: (orderedIds: string[]) => void;
  
  // Data
  getSectionData: (sectionId: string) => SectionItem[];
  setSectionData: (sectionId: string, items: SectionItem[]) => void;
  
  // Export/Import
  exportAll: () => { workspaces: Workspace[]; sections: Section[]; items: Record<string, SectionItem[]> };
  importAll: (data: { workspaces: Workspace[]; sections: Section[]; items: Record<string, SectionItem[]> }) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// Generate unique ID
function generateId(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// Load from localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Save to localStorage
function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  // Workspaces state
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = loadFromStorage<Workspace[]>(WORKSPACES_KEY, []);
    if (saved.length === 0) {
      return [DEFAULT_WORKSPACE];
    }
    return saved;
  });
  
  // Active workspace
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return loadFromStorage<string>(ACTIVE_WORKSPACE_KEY, 'default');
  });
  
  // All sections
  const [allSections, setAllSections] = useState<Section[]>(() => 
    loadFromStorage<Section[]>(SECTIONS_KEY, [])
  );
  
  // Data cache
  const [dataCache, setDataCache] = useState<Record<string, SectionItem[]>>({});
  
  // Active workspace
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;
  
  // Filtered sections for active workspace
  const sections = allSections
    .filter(s => s.workspaceId === activeWorkspaceId)
    .sort((a, b) => a.order - b.order);
  
  // Save workspaces when changed
  useEffect(() => {
    saveToStorage(WORKSPACES_KEY, workspaces);
  }, [workspaces]);
  
  // Save active workspace when changed
  useEffect(() => {
    saveToStorage(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
  }, [activeWorkspaceId]);
  
  // Save sections when changed
  useEffect(() => {
    saveToStorage(SECTIONS_KEY, allSections);
  }, [allSections]);
  
  // Workspace CRUD
  const addWorkspace = useCallback((workspace: Omit<Workspace, 'id' | 'order' | 'createdAt' | 'updatedAt'>): Workspace => {
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
      ...workspace,
      id: generateId(),
      order: Math.max(...workspaces.map(w => w.order), -1) + 1,
      createdAt: now,
      updatedAt: now,
    };
    setWorkspaces(prev => [...prev, newWorkspace].sort((a, b) => a.order - b.order));
    return newWorkspace;
  }, [workspaces]);
  
  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
    ));
  }, []);
  
  const deleteWorkspace = useCallback((id: string): boolean => {
    const workspace = workspaces.find(w => w.id === id);
    if (workspace?.isDefault) return false;
    
    // Remove workspace
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    
    // Remove all sections in this workspace
    setAllSections(prev => prev.filter(s => s.workspaceId !== id));
    
    // Switch to first workspace if deleted active
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter(w => w.id !== id);
      if (remaining.length > 0) {
        setActiveWorkspaceId(remaining[0].id);
      }
    }
    
    return true;
  }, [workspaces, activeWorkspaceId]);
  
  const reorderWorkspaces = useCallback((orderedIds: string[]) => {
    setWorkspaces(prev => 
      orderedIds.map((id, index) => {
        const workspace = prev.find(w => w.id === id);
        return workspace ? { ...workspace, order: index } : null;
      }).filter(Boolean) as Workspace[]
    );
  }, []);
  
  const duplicateWorkspace = useCallback((id: string, name: string): Workspace | null => {
    const original = workspaces.find(w => w.id === id);
    if (!original) return null;
    
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
      id: generateId(),
      name,
      color: original.color,
      icon: original.icon,
      order: Math.max(...workspaces.map(w => w.order), -1) + 1,
      createdAt: now,
      updatedAt: now,
    };
    
    // Duplicate sections
    const originalSections = allSections.filter(s => s.workspaceId === id);
    const newSections: Section[] = originalSections.map(s => ({
      ...s,
      id: generateId(),
      workspaceId: newWorkspace.id,
    }));
    
    setWorkspaces(prev => [...prev, newWorkspace].sort((a, b) => a.order - b.order));
    setAllSections(prev => [...prev, ...newSections]);
    
    return newWorkspace;
  }, [workspaces, allSections]);
  
  // Section CRUD
  const addSection = useCallback((section: Omit<Section, 'workspaceId' | 'order' | 'createdAt'>): Section => {
    const newSection: Section = {
      ...section,
      workspaceId: activeWorkspaceId,
      order: Math.max(...allSections.filter(s => s.workspaceId === activeWorkspaceId).map(s => s.order), -1) + 1,
      createdAt: new Date().toISOString(),
    };
    setAllSections(prev => [...prev, newSection]);
    return newSection;
  }, [activeWorkspaceId, allSections]);
  
  const updateSection = useCallback((id: string, updates: Partial<Section>) => {
    setAllSections(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  }, []);
  
  const deleteSection = useCallback((id: string): boolean => {
    const section = allSections.find(s => s.id === id);
    if (section?.isSystem || section?.isDefault) return false;
    
    setAllSections(prev => prev.filter(s => s.id !== id));
    setDataCache(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    
    return true;
  }, [allSections]);
  
  const reorderSections = useCallback((orderedIds: string[]) => {
    setAllSections(prev => 
      prev.map(s => {
        const index = orderedIds.indexOf(s.id);
        return index >= 0 ? { ...s, order: index } : s;
      })
    );
  }, []);
  
  // Data access
  const getSectionData = useCallback((sectionId: string): SectionItem[] => {
    if (!dataCache[sectionId]) {
      const data = loadFromStorage<SectionItem[]>(`section-data-${sectionId}`, []);
      setDataCache(prev => ({ ...prev, [sectionId]: data }));
      return data;
    }
    return dataCache[sectionId];
  }, [dataCache]);
  
  const setSectionData = useCallback((sectionId: string, items: SectionItem[]) => {
    saveToStorage(`section-data-${sectionId}`, items);
    setDataCache(prev => ({ ...prev, [sectionId]: items }));
  }, []);
  
  // Export/Import
  const exportAll = useCallback(() => {
    const items: Record<string, SectionItem[]> = {};
    allSections.forEach(s => {
      items[s.id] = getSectionData(s.id);
    });
    
    return {
      workspaces,
      sections: allSections,
      items,
    };
  }, [workspaces, allSections, getSectionData]);
  
  const importAll = useCallback((data: { workspaces: Workspace[]; sections: Section[]; items: Record<string, SectionItem[]> }) => {
    setWorkspaces(data.workspaces);
    setAllSections(data.sections);
    setDataCache(data.items);
    
    // Save items to storage
    Object.entries(data.items).forEach(([sectionId, items]) => {
      saveToStorage(`section-data-${sectionId}`, items);
    });
    
    // Set active workspace to first
    if (data.workspaces.length > 0) {
      setActiveWorkspaceId(data.workspaces[0].id);
    }
  }, []);
  
  const value: WorkspaceContextValue = {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    duplicateWorkspace,
    sections,
    allSections,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    getSectionData,
    setSectionData,
    exportAll,
    importAll,
  };
  
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaces must be used within a WorkspaceProvider');
  }
  return context;
}

// Convenience hook for active workspace only
export function useActiveWorkspace() {
  const { activeWorkspace, activeWorkspaceId, sections, setActiveWorkspaceId } = useWorkspaces();
  return { activeWorkspace, activeWorkspaceId, sections, setActiveWorkspaceId };
}
