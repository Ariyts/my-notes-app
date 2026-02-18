/**
 * Universal Storage
 * 
 * Provides a unified API for storing and retrieving section data.
 * Replaces the previous type-specific storage with a section-based approach.
 */

import { v4 as uuidv4 } from 'uuid';
import { SectionItem, Section } from '../types/sections';
import { 
  SECTIONS_STORAGE_KEY, 
  SECTION_DATA_PREFIX, 
  LEGACY_KEYS,
  MIGRATION_FLAG_KEY,
  DEFAULT_SECTIONS 
} from '../config/sections';

// Generic storage helpers
function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Get storage key for a section
function getSectionKey(sectionId: string): string {
  return `${SECTION_DATA_PREFIX}${sectionId}`;
}

// Check if migration has been done
function isMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

// Mark migration as complete
function markMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

// Migrate old data to new format
function migrateOldData(): void {
  if (isMigrated()) return;

  // Migrate prompts
  const oldPrompts = getCollection<any>(LEGACY_KEYS.prompts);
  if (oldPrompts.length > 0) {
    const newItems: SectionItem[] = oldPrompts.map(p => ({
      id: p.id || uuidv4(),
      sectionId: 'prompts',
      data: {
        title: p.title,
        content: p.content,
        category: p.category,
      },
      tags: p.tags || [],
      updatedAt: p.updatedAt || new Date().toISOString(),
    }));
    saveCollection(getSectionKey('prompts'), newItems);
  }

  // Migrate notes
  const oldNotes = getCollection<any>(LEGACY_KEYS.notes);
  if (oldNotes.length > 0) {
    const newItems: SectionItem[] = oldNotes.map(n => ({
      id: n.id || uuidv4(),
      sectionId: 'notes',
      data: {
        title: n.title,
        content: n.content,
        category: n.category,
      },
      tags: n.tags || [],
      updatedAt: n.updatedAt || new Date().toISOString(),
    }));
    saveCollection(getSectionKey('notes'), newItems);
  }

  // Migrate snippets
  const oldSnippets = getCollection<any>(LEGACY_KEYS.snippets);
  if (oldSnippets.length > 0) {
    const newItems: SectionItem[] = oldSnippets.map(s => ({
      id: s.id || uuidv4(),
      sectionId: 'snippets',
      data: {
        title: s.title,
        command: s.command,
        tool: s.tool,
        description: s.description,
      },
      tags: s.tags || [],
      updatedAt: new Date().toISOString(),
    }));
    saveCollection(getSectionKey('snippets'), newItems);
  }

  // Migrate resources
  const oldResources = getCollection<any>(LEGACY_KEYS.resources);
  if (oldResources.length > 0) {
    const newItems: SectionItem[] = oldResources.map(r => ({
      id: r.id || uuidv4(),
      sectionId: 'resources',
      data: {
        title: r.title,
        url: r.url,
        category: r.category,
        note: r.note,
      },
      tags: [],
      updatedAt: new Date().toISOString(),
    }));
    saveCollection(getSectionKey('resources'), newItems);
  }

  markMigrated();
}

// Load sections from storage or use defaults
function loadSections(): Section[] {
  const saved = localStorage.getItem(SECTIONS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all default sections exist
      const defaultIds = DEFAULT_SECTIONS.map(s => s.id);
      const customSections = parsed.filter((s: Section) => !defaultIds.includes(s.id));
      return [...DEFAULT_SECTIONS, ...customSections].sort((a, b) => a.order - b.order);
    } catch {
      return [...DEFAULT_SECTIONS];
    }
  }
  return [...DEFAULT_SECTIONS];
}

// Save sections to storage
function saveSections(sections: Section[]): void {
  localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections));
}

// Universal Storage API
export const universalStorage = {
  // Sections management
  getSections: (): Section[] => {
    // Run migration on first access
    migrateOldData();
    return loadSections();
  },

  saveSections: (sections: Section[]): void => {
    saveSections(sections);
  },

  addSection: (section: Omit<Section, 'order' | 'createdAt'>): Section => {
    const sections = loadSections();
    const newSection: Section = {
      ...section,
      order: Math.max(...sections.map(s => s.order), -1) + 1,
      createdAt: new Date().toISOString(),
    };
    saveSections([...sections, newSection]);
    return newSection;
  },

  updateSection: (id: string, updates: Partial<Section>): void => {
    const sections = loadSections();
    const updated = sections.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    saveSections(updated);
  },

  deleteSection: (id: string): boolean => {
    const sections = loadSections();
    const section = sections.find(s => s.id === id);
    if (section?.isDefault) return false;
    
    const filtered = sections.filter(s => s.id !== id);
    saveSections(filtered);
    
    // Also delete section data
    localStorage.removeItem(getSectionKey(id));
    return true;
  },

  reorderSections: (orderedIds: string[]): void => {
    const sections = loadSections();
    const reordered = orderedIds.map((id, index) => {
      const section = sections.find(s => s.id === id);
      return section ? { ...section, order: index } : null;
    }).filter(Boolean) as Section[];
    saveSections(reordered);
  },

  // Items management
  getItems: (sectionId: string): SectionItem[] => {
    return getCollection<SectionItem>(getSectionKey(sectionId));
  },

  setItems: (sectionId: string, items: SectionItem[]): void => {
    saveCollection(getSectionKey(sectionId), items);
  },

  addItem: (sectionId: string, data: Record<string, unknown>, tags: string[] = []): SectionItem => {
    const items = getCollection<SectionItem>(getSectionKey(sectionId));
    const newItem: SectionItem = {
      id: uuidv4(),
      sectionId,
      data,
      tags,
      updatedAt: new Date().toISOString(),
    };
    saveCollection(getSectionKey(sectionId), [...items, newItem]);
    return newItem;
  },

  updateItem: (sectionId: string, id: string, updates: Partial<Pick<SectionItem, 'data' | 'tags'>>): void => {
    const items = getCollection<SectionItem>(getSectionKey(sectionId));
    const updated = items.map(item => 
      item.id === id 
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item
    );
    saveCollection(getSectionKey(sectionId), updated);
  },

  deleteItem: (sectionId: string, id: string): void => {
    const items = getCollection<SectionItem>(getSectionKey(sectionId));
    const filtered = items.filter(item => item.id !== id);
    saveCollection(getSectionKey(sectionId), filtered);
  },

  // Utility
  clearAll: (): void => {
    // Clear all section data
    const sections = loadSections();
    sections.forEach(s => {
      localStorage.removeItem(getSectionKey(s.id));
    });
    // Clear sections config
    localStorage.removeItem(SECTIONS_STORAGE_KEY);
    // Clear migration flag
    localStorage.removeItem(MIGRATION_FLAG_KEY);
  },

  exportAll: (): { sections: Section[]; data: Record<string, SectionItem[]> } => {
    const sections = loadSections();
    const data: Record<string, SectionItem[]> = {};
    sections.forEach(s => {
      data[s.id] = getCollection<SectionItem>(getSectionKey(s.id));
    });
    return { sections, data };
  },

  importAll: (exported: { sections: Section[]; data: Record<string, SectionItem[]> }): void => {
    saveSections(exported.sections);
    Object.entries(exported.data).forEach(([sectionId, items]) => {
      saveCollection(getSectionKey(sectionId), items);
    });
    markMigrated();
  },
};
