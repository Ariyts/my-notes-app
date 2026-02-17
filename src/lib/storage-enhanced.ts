import { v4 as uuidv4 } from 'uuid';
import { Prompt, Note, Snippet, Resource } from '../types';

// Import initial data from JSON files (bundled at build time)
import initialPrompts from '../data/prompts.json';
import initialNotes from '../data/notes.json';
import initialSnippets from '../data/snippets.json';
import initialResources from '../data/resources.json';

const STORAGE_KEYS = {
  PROMPTS: 'pentest_prompts',
  NOTES: 'pentest_notes',
  SNIPPETS: 'pentest_snippets',
  RESOURCES: 'pentest_resources',
  HISTORY: 'pentest_history',
  PROMPT_ORDER: 'pentest_prompt_order',
  SNIPPET_ORDER: 'pentest_snippet_order',
  DATA_VERSION: 'pentest_data_version',
};

const DATA_VERSION = '2.0'; // Increment this to force reload from JSON

export interface HistoryEntry {
  id: string;
  itemId: string;
  itemType: 'note' | 'prompt';
  content: string;
  title: string;
  timestamp: string;
}

function getCollection<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Initialize data from bundled JSON if localStorage is empty or version changed
 */
function initializeFromJson(): void {
  const currentVersion = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);

  // If version changed or first load, initialize from JSON
  if (currentVersion !== DATA_VERSION) {
    if (!localStorage.getItem(STORAGE_KEYS.PROMPTS)) {
      localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(initialPrompts));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(initialNotes));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SNIPPETS)) {
      localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(initialSnippets));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESOURCES)) {
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(initialResources));
    }
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, DATA_VERSION);
  }
}

// Initialize on module load
initializeFromJson();

export const history = {
  add: (
    itemId: string,
    itemType: 'note' | 'prompt',
    title: string,
    content: string
  ) => {
    const entries = getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY);
    const otherEntries = entries.filter((e) => e.itemId !== itemId);
    const itemEntries = entries.filter((e) => e.itemId === itemId).slice(-49);
    const newEntry: HistoryEntry = {
      id: uuidv4(),
      itemId,
      itemType,
      title,
      content,
      timestamp: new Date().toISOString(),
    };
    saveCollection(STORAGE_KEYS.HISTORY, [...otherEntries, ...itemEntries, newEntry]);
  },
  getForItem: (itemId: string): HistoryEntry[] => {
    return getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY)
      .filter((e) => e.itemId === itemId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  },
  restore: (entryId: string): HistoryEntry | null => {
    return (
      getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY).find(
        (e) => e.id === entryId
      ) || null
    );
  },
  clearForItem: (itemId: string) => {
    saveCollection(
      STORAGE_KEYS.HISTORY,
      getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY).filter(
        (e) => e.itemId !== itemId
      )
    );
  },
};

export const ordering = {
  getPromptOrder: (): string[] =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMPT_ORDER) || '[]'),
  savePromptOrder: (order: string[]) =>
    localStorage.setItem(STORAGE_KEYS.PROMPT_ORDER, JSON.stringify(order)),
  getSnippetOrder: (): string[] =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.SNIPPET_ORDER) || '[]'),
  saveSnippetOrder: (order: string[]) =>
    localStorage.setItem(STORAGE_KEYS.SNIPPET_ORDER, JSON.stringify(order)),
};

export const storageEnhanced = {
  prompts: {
    getAll: () => getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => {
      const newItem = {
        ...item,
        id: uuidv4(),
        updatedAt: new Date().toISOString(),
      };
      saveCollection(STORAGE_KEYS.PROMPTS, [
        ...getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
        newItem,
      ]);
      return newItem;
    },
    update: (id: string, updates: Partial<Prompt>) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      const existing = collection.find((p) => p.id === id);
      if (
        existing &&
        updates.content &&
        updates.content !== existing.content
      ) {
        history.add(id, 'prompt', existing.title, existing.content);
      }
      saveCollection(STORAGE_KEYS.PROMPTS, [
        ...collection.map((p) =>
          p.id === id
            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
            : p
        ),
      ]);
    },
    delete: (id: string) => {
      history.clearForItem(id);
      saveCollection(
        STORAGE_KEYS.PROMPTS,
        getCollection<Prompt>(STORAGE_KEYS.PROMPTS).filter((p) => p.id !== id)
      );
    },
    reorder: (orderedIds: string[]) => {
      ordering.savePromptOrder(orderedIds);
    },
  },
  notes: {
    getAll: () => getCollection<Note>(STORAGE_KEYS.NOTES),
    add: (item: Omit<Note, 'id' | 'updatedAt'>): Note => {
      const newItem = {
        ...item,
        id: uuidv4(),
        updatedAt: new Date().toISOString(),
      };
      saveCollection(STORAGE_KEYS.NOTES, [
        ...getCollection<Note>(STORAGE_KEYS.NOTES),
        newItem,
      ]);
      return newItem;
    },
    update: (id: string, updates: Partial<Note>): void => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      const existing = collection.find((n) => n.id === id);
      if (
        existing &&
        updates.content &&
        updates.content !== existing.content
      ) {
        history.add(id, 'note', existing.title, existing.content);
      }
      saveCollection(STORAGE_KEYS.NOTES, [
        ...collection.map((n) =>
          n.id === id
            ? { ...n, ...updates, updatedAt: new Date().toISOString() }
            : n
        ),
      ]);
    },
    delete: (id: string): void => {
      history.clearForItem(id);
      saveCollection(
        STORAGE_KEYS.NOTES,
        getCollection<Note>(STORAGE_KEYS.NOTES).filter((n) => n.id !== id)
      );
    },
  },
  snippets: {
    getAll: () => getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
    add: (item: Omit<Snippet, 'id'>) => {
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.SNIPPETS, [
        ...getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
        newItem,
      ]);
      return newItem;
    },
    update: (id: string, updates: Partial<Snippet>) => {
      saveCollection(STORAGE_KEYS.SNIPPETS, [
        ...getCollection<Snippet>(STORAGE_KEYS.SNIPPETS).map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      ]);
    },
    delete: (id: string) => {
      saveCollection(
        STORAGE_KEYS.SNIPPETS,
        getCollection<Snippet>(STORAGE_KEYS.SNIPPETS).filter(
          (s) => s.id !== id
        )
      );
    },
  },
  resources: {
    getAll: () => getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    add: (item: Omit<Resource, 'id'>) => {
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.RESOURCES, [
        ...getCollection<Resource>(STORAGE_KEYS.RESOURCES),
        newItem,
      ]);
      return newItem;
    },
    update: (id: string, updates: Partial<Resource>) => {
      saveCollection(STORAGE_KEYS.RESOURCES, [
        ...getCollection<Resource>(STORAGE_KEYS.RESOURCES).map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      ]);
    },
    delete: (id: string) => {
      saveCollection(
        STORAGE_KEYS.RESOURCES,
        getCollection<Resource>(STORAGE_KEYS.RESOURCES).filter(
          (r) => r.id !== id
        )
      );
    },
  },
  history,
  ordering,
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('prompt_favorites');
  },
  /**
   * Export all data for repository sync
   */
  exportAll: async () => ({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    prompts: getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
    notes: getCollection<Note>(STORAGE_KEYS.NOTES),
    snippets: getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
    resources: getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    promptOrder: ordering.getPromptOrder(),
    snippetOrder: ordering.getSnippetOrder(),
  }),
  importAll: (data: {
    prompts?: unknown;
    notes?: unknown;
    snippets?: unknown;
    resources?: unknown;
    promptOrder?: unknown;
    snippetOrder?: unknown;
  }) => {
    if (data.prompts)
      localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(data.prompts));
    if (data.notes)
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    if (data.snippets)
      localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(data.snippets));
    if (data.resources)
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(data.resources));
    if (data.promptOrder)
      localStorage.setItem(
        STORAGE_KEYS.PROMPT_ORDER,
        JSON.stringify(data.promptOrder)
      );
    if (data.snippetOrder)
      localStorage.setItem(
        STORAGE_KEYS.SNIPPET_ORDER,
        JSON.stringify(data.snippetOrder)
      );
  },
  exportToMarkdown: async (): Promise<string> => {
    const notes = getCollection<Note>(STORAGE_KEYS.NOTES);
    let markdown = '# Pentest Hub Notes Export\n\n';
    markdown += `_Exported on ${new Date().toLocaleDateString()}_\n\n---\n\n`;
    const grouped = notes.reduce(
      (acc, note) => {
        if (!acc[note.category]) acc[note.category] = [];
        acc[note.category].push(note);
        return acc;
      },
      {} as Record<string, Note[]>
    );
    Object.entries(grouped)
      .sort()
      .forEach(([category, categoryNotes]) => {
        markdown += `## ${category}\n\n`;
        categoryNotes.forEach((note) => {
          markdown += `### ${note.title}\n\n${note.content}\n\n`;
          if (note.tags.length > 0)
            markdown += `_Tags: ${note.tags.join(', ')}_\n\n`;
          markdown += '---\n\n';
        });
      });
    return markdown;
  },
  /**
   * Reset all data to initial JSON state (clear localStorage)
   */
  resetToInitial: () => {
    localStorage.removeItem(STORAGE_KEYS.PROMPTS);
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    localStorage.removeItem(STORAGE_KEYS.SNIPPETS);
    localStorage.removeItem(STORAGE_KEYS.RESOURCES);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.PROMPT_ORDER);
    localStorage.removeItem(STORAGE_KEYS.SNIPPET_ORDER);
    localStorage.removeItem(STORAGE_KEYS.DATA_VERSION);
    initializeFromJson();
  },
};

// For backward compatibility
export const storage = {
  prompts: storageEnhanced.prompts,
  notes: storageEnhanced.notes,
  snippets: storageEnhanced.snippets,
  resources: storageEnhanced.resources,
  seed: initializeFromJson,
  clearAll: storageEnhanced.clearAll,
  exportAll: storageEnhanced.exportAll,
  importAll: storageEnhanced.importAll,
};
