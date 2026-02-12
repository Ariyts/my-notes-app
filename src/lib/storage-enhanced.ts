import { v4 as uuidv4 } from 'uuid';
import { Prompt, Note, Snippet, Resource } from '../types';

const STORAGE_KEYS = {
  PROMPTS: 'pentest_prompts',
  NOTES: 'pentest_notes',
  SNIPPETS: 'pentest_snippets',
  RESOURCES: 'pentest_resources',
  HISTORY: 'pentest_history',
  GIST_CONFIG: 'pentest_gist_config',
  PROMPT_ORDER: 'pentest_prompt_order',
  SNIPPET_ORDER: 'pentest_snippet_order',
};

// Version history for notes
export interface HistoryEntry {
  id: string;
  itemId: string;
  itemType: 'note' | 'prompt';
  content: string;
  title: string;
  timestamp: string;
}

// Gist configuration
export interface GistConfig {
  token: string;
  gistId: string | null;
  lastSync: string | null;
  autoSync: boolean;
}

// Generic storage helper
function getCollection<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// History management
export const history = {
  add: (itemId: string, itemType: 'note' | 'prompt', title: string, content: string) => {
    const entries = getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY);
    
    // Keep only last 50 versions per item
    const otherEntries = entries.filter(e => e.itemId !== itemId);
    const itemEntries = entries.filter(e => e.itemId === itemId).slice(-49);
    
    const newEntry: HistoryEntry = {
      id: uuidv4(),
      itemId,
      itemType,
      title,
      content,
      timestamp: new Date().toISOString()
    };
    
    saveCollection(STORAGE_KEYS.HISTORY, [...otherEntries, ...itemEntries, newEntry]);
  },
  
  getForItem: (itemId: string): HistoryEntry[] => {
    return getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY)
      .filter(e => e.itemId === itemId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  
  restore: (entryId: string): HistoryEntry | null => {
    const entries = getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY);
    return entries.find(e => e.id === entryId) || null;
  },
  
  clearForItem: (itemId: string) => {
    const entries = getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY);
    saveCollection(STORAGE_KEYS.HISTORY, entries.filter(e => e.itemId !== itemId));
  }
};

// Gist Sync
export const gistSync = {
  getConfig: (): GistConfig => {
    const data = localStorage.getItem(STORAGE_KEYS.GIST_CONFIG);
    return data ? JSON.parse(data) : { token: '', gistId: null, lastSync: null, autoSync: false };
  },
  
  saveConfig: (config: GistConfig) => {
    localStorage.setItem(STORAGE_KEYS.GIST_CONFIG, JSON.stringify(config));
  },
  
  // Encrypt data before sending to Gist (placeholder - will be enhanced with real crypto)
  encryptForGist: (data: any, _password: string): string => {
    // Base64 encode for now - will be replaced with AES-256-GCM
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  },
  
  decryptFromGist: (encrypted: string, _password: string): any => {
    try {
      const json = decodeURIComponent(escape(atob(encrypted)));
      return JSON.parse(json);
    } catch {
      throw new Error('Failed to decrypt data');
    }
  },
  
  // Push data to Gist
  push: async (password: string): Promise<{ success: boolean; error?: string; gistId?: string }> => {
    const config = gistSync.getConfig();
    if (!config.token) {
      return { success: false, error: 'No GitHub token configured' };
    }
    
    const allData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
      notes: getCollection<Note>(STORAGE_KEYS.NOTES),
      snippets: getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
      resources: getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    };
    
    const encrypted = gistSync.encryptForGist(allData, password);
    
    const gistPayload = {
      description: 'Pentest Hub Encrypted Backup',
      public: false,
      files: {
        'pentest-hub-data.enc': {
          content: encrypted
        }
      }
    };
    
    try {
      let response;
      
      if (config.gistId) {
        // Update existing gist
        response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(gistPayload)
        });
      } else {
        // Create new gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(gistPayload)
        });
      }
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'GitHub API error' };
      }
      
      const gist = await response.json();
      
      // Save gist ID and update last sync
      gistSync.saveConfig({
        ...config,
        gistId: gist.id,
        lastSync: new Date().toISOString()
      });
      
      return { success: true, gistId: gist.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  },
  
  // Pull data from Gist
  pull: async (password: string): Promise<{ success: boolean; error?: string; data?: any }> => {
    const config = gistSync.getConfig();
    
    if (!config.token || !config.gistId) {
      return { success: false, error: 'No Gist configured' };
    }
    
    try {
      const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        return { success: false, error: 'Failed to fetch Gist' };
      }
      
      const gist = await response.json();
      const encryptedContent = gist.files['pentest-hub-data.enc']?.content;
      
      if (!encryptedContent) {
        return { success: false, error: 'Invalid Gist format' };
      }
      
      const data = gistSync.decryptFromGist(encryptedContent, password);
      
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to pull data' };
    }
  },
  
  // Apply pulled data
  applyPulledData: (data: any) => {
    if (data.prompts) localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(data.prompts));
    if (data.notes) localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    if (data.snippets) localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(data.snippets));
    if (data.resources) localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(data.resources));
    
    gistSync.saveConfig({
      ...gistSync.getConfig(),
      lastSync: new Date().toISOString()
    });
  }
};

// Order management for drag-and-drop
export const ordering = {
  getPromptOrder: (): string[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROMPT_ORDER);
    return data ? JSON.parse(data) : [];
  },
  
  savePromptOrder: (order: string[]) => {
    localStorage.setItem(STORAGE_KEYS.PROMPT_ORDER, JSON.stringify(order));
  },
  
  getSnippetOrder: (): string[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SNIPPET_ORDER);
    return data ? JSON.parse(data) : [];
  },
  
  saveSnippetOrder: (order: string[]) => {
    localStorage.setItem(STORAGE_KEYS.SNIPPET_ORDER, JSON.stringify(order));
  }
};

export const storageEnhanced = {
  prompts: {
    getAll: () => getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      const newItem = { ...item, id: uuidv4(), updatedAt: new Date().toISOString() };
      saveCollection(STORAGE_KEYS.PROMPTS, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Prompt>) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      const existing = collection.find(p => p.id === id);
      
      // Save to history before update
      if (existing && updates.content && updates.content !== existing.content) {
        history.add(id, 'prompt', existing.title, existing.content);
      }
      
      const updated = collection.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p);
      saveCollection(STORAGE_KEYS.PROMPTS, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      history.clearForItem(id);
      saveCollection(STORAGE_KEYS.PROMPTS, collection.filter(p => p.id !== id));
    },
    reorder: (orderedIds: string[]) => {
      ordering.savePromptOrder(orderedIds);
    }
  },
  notes: {
    getAll: () => getCollection<Note>(STORAGE_KEYS.NOTES),
    add: (item: Omit<Note, 'id' | 'updatedAt'>) => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      const newItem = { ...item, id: uuidv4(), updatedAt: new Date().toISOString() };
      saveCollection(STORAGE_KEYS.NOTES, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Note>) => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      const existing = collection.find(n => n.id === id);
      
      // Save to history before update
      if (existing && updates.content && updates.content !== existing.content) {
        history.add(id, 'note', existing.title, existing.content);
      }
      
      const updated = collection.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
      saveCollection(STORAGE_KEYS.NOTES, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      history.clearForItem(id);
      saveCollection(STORAGE_KEYS.NOTES, collection.filter(n => n.id !== id));
    }
  },
  snippets: {
    getAll: () => getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
    add: (item: Omit<Snippet, 'id'>) => {
      const collection = getCollection<Snippet>(STORAGE_KEYS.SNIPPETS);
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.SNIPPETS, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Snippet>) => {
      const collection = getCollection<Snippet>(STORAGE_KEYS.SNIPPETS);
      const updated = collection.map(s => s.id === id ? { ...s, ...updates } : s);
      saveCollection(STORAGE_KEYS.SNIPPETS, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Snippet>(STORAGE_KEYS.SNIPPETS);
      saveCollection(STORAGE_KEYS.SNIPPETS, collection.filter(s => s.id !== id));
    }
  },
  resources: {
    getAll: () => getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    add: (item: Omit<Resource, 'id'>) => {
      const collection = getCollection<Resource>(STORAGE_KEYS.RESOURCES);
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.RESOURCES, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Resource>) => {
      const collection = getCollection<Resource>(STORAGE_KEYS.RESOURCES);
      const updated = collection.map(r => r.id === id ? { ...r, ...updates } : r);
      saveCollection(STORAGE_KEYS.RESOURCES, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Resource>(STORAGE_KEYS.RESOURCES);
      saveCollection(STORAGE_KEYS.RESOURCES, collection.filter(r => r.id !== id));
    }
  },
  history,
  gistSync,
  ordering,
  
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('prompt_favorites');
  },
  
  exportAll: () => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
      notes: getCollection<Note>(STORAGE_KEYS.NOTES),
      snippets: getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
      resources: getCollection<Resource>(STORAGE_KEYS.RESOURCES),
      promptOrder: ordering.getPromptOrder(),
      snippetOrder: ordering.getSnippetOrder(),
    };
  },
  
  importAll: (data: any) => {
    if (data.prompts) localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(data.prompts));
    if (data.notes) localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    if (data.snippets) localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(data.snippets));
    if (data.resources) localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(data.resources));
    if (data.promptOrder) localStorage.setItem(STORAGE_KEYS.PROMPT_ORDER, JSON.stringify(data.promptOrder));
    if (data.snippetOrder) localStorage.setItem(STORAGE_KEYS.SNIPPET_ORDER, JSON.stringify(data.snippetOrder));
  },
  
  // Export to Markdown (for notes)
  exportToMarkdown: (): string => {
    const notes = getCollection<Note>(STORAGE_KEYS.NOTES);
    let markdown = '# Pentest Hub Notes Export\n\n';
    markdown += `_Exported on ${new Date().toLocaleDateString()}_\n\n---\n\n`;
    
    // Group by category
    const grouped = notes.reduce((acc, note) => {
      if (!acc[note.category]) acc[note.category] = [];
      acc[note.category].push(note);
      return acc;
    }, {} as Record<string, Note[]>);
    
    Object.entries(grouped).sort().forEach(([category, categoryNotes]) => {
      markdown += `## ${category}\n\n`;
      categoryNotes.forEach(note => {
        markdown += `### ${note.title}\n\n`;
        markdown += `${note.content}\n\n`;
        if (note.tags.length > 0) {
          markdown += `_Tags: ${note.tags.join(', ')}_\n\n`;
        }
        markdown += '---\n\n';
      });
    });
    
    return markdown;
  }
};
