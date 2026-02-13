
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

export interface HistoryEntry {
  id: string; itemId: string; itemType: 'note' | 'prompt';
  content: string; title: string; timestamp: string;
}

export interface GistConfig {
  token: string; gistId: string | null;
  lastSync: string | null; autoSync: boolean;
}

function getCollection<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const history = {
  add: (itemId: string, itemType: 'note' | 'prompt', title: string, content: string) => {
    const entries = getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY);
    const otherEntries = entries.filter(e => e.itemId !== itemId);
    const itemEntries = entries.filter(e => e.itemId === itemId).slice(-49);
    const newEntry: HistoryEntry = { id: uuidv4(), itemId, itemType, title, content, timestamp: new Date().toISOString() };
    saveCollection(STORAGE_KEYS.HISTORY, [...otherEntries, ...itemEntries, newEntry]);
  },
  getForItem: (itemId: string): HistoryEntry[] => {
    return getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY).filter(e => e.itemId === itemId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  restore: (entryId: string): HistoryEntry | null => {
    return getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY).find(e => e.id === entryId) || null;
  },
  clearForItem: (itemId: string) => {
    saveCollection(STORAGE_KEYS.HISTORY, getCollection<HistoryEntry>(STORAGE_KEYS.HISTORY).filter(e => e.itemId !== itemId));
  }
};

export const gistSync = {
  getConfig: (): GistConfig => {
    const data = localStorage.getItem(STORAGE_KEYS.GIST_CONFIG);
    return data ? JSON.parse(data) : { token: '', gistId: null, lastSync: null, autoSync: false };
  },
  saveConfig: (config: GistConfig) => {
    localStorage.setItem(STORAGE_KEYS.GIST_CONFIG, JSON.stringify(config));
  },
  encryptForGist: (data: any, _password: string): string => {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  },
  decryptFromGist: (encrypted: string, _password: string): any => {
    try {
      const json = decodeURIComponent(escape(atob(encrypted)));
      return JSON.parse(json);
    } catch { throw new Error('Failed to decrypt data'); }
  },
  push: async (password: string): Promise<{ success: boolean; error?: string; gistId?: string }> => {
    const config = gistSync.getConfig();
    if (!config.token) return { success: false, error: 'No GitHub token configured' };

    const allData = {
      version: '1.0', exportedAt: new Date().toISOString(),
      prompts: getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
      notes: getCollection<Note>(STORAGE_KEYS.NOTES),
      snippets: getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
      resources: getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    };
    const encrypted = gistSync.encryptForGist(allData, password);
    const gistPayload = {
      description: 'Pentest Hub Encrypted Backup', public: false,
      files: { 'pentest-hub-data.enc': { content: encrypted } }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const url = config.gistId ? `https://api.github.com/gists/${config.gistId}` : 'https://api.github.com/gists';
      const method = config.gistId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(gistPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: `GitHub API Error: ${error.message || 'Unknown error'}` };
      }

      const gist = await response.json();
      gistSync.saveConfig({ ...config, gistId: gist.id, lastSync: new Date().toISOString() });
      return { success: true, gistId: gist.id };

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { success: false, error: 'Request timed out (20s). Please check your network connection.' };
      }
      return { success: false, error: `Network error: ${err.message || 'Failed to connect to GitHub'}` };
    }
  },
  pull: async (password: string): Promise<{ success: boolean; error?: string; data?: any }> => {
    const config = gistSync.getConfig();
    if (!config.token || !config.gistId) return { success: false, error: 'No Gist configured. Push data first.' };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: `GitHub API Error: ${error.message || 'Failed to fetch Gist'}` };
      }

      const gist = await response.json();
      const encryptedContent = gist.files['pentest-hub-data.enc']?.content;
      if (!encryptedContent) return { success: false, error: 'Invalid Gist format: file not found.' };

      const data = gistSync.decryptFromGist(encryptedContent, password);
      return { success: true, data };

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { success: false, error: 'Request timed out (20s). Please check your network connection.' };
      }
      return { success: false, error: `Network error: ${err.message || 'Failed to pull data'}` };
    }
  },
  applyPulledData: (data: any) => {
    if (data.prompts) localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(data.prompts));
    if (data.notes) localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    if (data.snippets) localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(data.snippets));
    if (data.resources) localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(data.resources));
    gistSync.saveConfig({ ...gistSync.getConfig(), lastSync: new Date().toISOString() });
  }
};

export const ordering = {
  getPromptOrder: (): string[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMPT_ORDER) || '[]'),
  savePromptOrder: (order: string[]) => localStorage.setItem(STORAGE_KEYS.PROMPT_ORDER, JSON.stringify(order)),
  getSnippetOrder: (): string[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.SNIPPET_ORDER) || '[]'),
  saveSnippetOrder: (order: string[]) => localStorage.setItem(STORAGE_KEYS.SNIPPET_ORDER, JSON.stringify(order))
};

export const storageEnhanced = {
  prompts: {
    getAll: () => getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => {
      const newItem = { ...item, id: uuidv4(), updatedAt: new Date().toISOString() };
      saveCollection(STORAGE_KEYS.PROMPTS, [...getCollection<Prompt>(STORAGE_KEYS.PROMPTS), newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Prompt>) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      const existing = collection.find(p => p.id === id);
      if (existing && updates.content && updates.content !== existing.content) {
        history.add(id, 'prompt', existing.title, existing.content);
      }
      saveCollection(STORAGE_KEYS.PROMPTS, collection.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    },
    delete: (id: string) => {
      history.clearForItem(id);
      saveCollection(STORAGE_KEYS.PROMPTS, getCollection<Prompt>(STORAGE_KEYS.PROMPTS).filter(p => p.id !== id));
    },
    reorder: (orderedIds: string[]) => { ordering.savePromptOrder(orderedIds); }
  },
  notes: {
    getAll: () => getCollection<Note>(STORAGE_KEYS.NOTES),
    add: (item: Omit<Note, 'id' | 'updatedAt'>): Note => {
      const newItem = { ...item, id: uuidv4(), updatedAt: new Date().toISOString() };
      saveCollection(STORAGE_KEYS.NOTES, [...getCollection<Note>(STORAGE_KEYS.NOTES), newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Note>): void => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      const existing = collection.find(n => n.id === id);
      if (existing && updates.content && updates.content !== existing.content) {
        history.add(id, 'note', existing.title, existing.content);
      }
      saveCollection(STORAGE_KEYS.NOTES, collection.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    },
    delete: (id: string): void => {
      history.clearForItem(id);
      saveCollection(STORAGE_KEYS.NOTES, getCollection<Note>(STORAGE_KEYS.NOTES).filter(n => n.id !== id));
    }
  },
  snippets: {
    getAll: () => getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
    add: (item: Omit<Snippet, 'id'>) => {
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.SNIPPETS, [...getCollection<Snippet>(STORAGE_KEYS.SNIPPETS), newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Snippet>) => {
      saveCollection(STORAGE_KEYS.SNIPPETS, getCollection<Snippet>(STORAGE_KEYS.SNIPPETS).map(s => s.id === id ? { ...s, ...updates } : s));
    },
    delete: (id: string) => {
      saveCollection(STORAGE_KEYS.SNIPPETS, getCollection<Snippet>(STORAGE_KEYS.SNIPPETS).filter(s => s.id !== id));
    }
  },
  resources: {
    getAll: () => getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    add: (item: Omit<Resource, 'id'>) => {
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.RESOURCES, [...getCollection<Resource>(STORAGE_KEYS.RESOURCES), newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Resource>) => {
      saveCollection(STORAGE_KEYS.RESOURCES, getCollection<Resource>(STORAGE_KEYS.RESOURCES).map(r => r.id === id ? { ...r, ...updates } : r));
    },
    delete: (id: string) => {
      saveCollection(STORAGE_KEYS.RESOURCES, getCollection<Resource>(STORAGE_KEYS.RESOURCES).filter(r => r.id !== id));
    }
  },
  history,
  gistSync,
  ordering,
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('prompt_favorites');
  },
  exportAll: async () => ({
    version: '1.0', exportedAt: new Date().toISOString(),
    prompts: getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
    notes: getCollection<Note>(STORAGE_KEYS.NOTES),
    snippets: getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
    resources: getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    promptOrder: ordering.getPromptOrder(),
    snippetOrder: ordering.getSnippetOrder(),
  }),
  importAll: (data: any) => {
    if (data.prompts) localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(data.prompts));
    if (data.notes) localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    if (data.snippets) localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(data.snippets));
    if (data.resources) localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(data.resources));
    if (data.promptOrder) localStorage.setItem(STORAGE_KEYS.PROMPT_ORDER, JSON.stringify(data.promptOrder));
    if (data.snippetOrder) localStorage.setItem(STORAGE_KEYS.SNIPPET_ORDER, JSON.stringify(data.snippetOrder));
  },
  exportToMarkdown: async (): Promise<string> => {
    const notes = getCollection<Note>(STORAGE_KEYS.NOTES);
    let markdown = '# Pentest Hub Notes Export\n\n';
    markdown += `_Exported on ${new Date().toLocaleDateString()}_\n\n---\n\n`;
    const grouped = notes.reduce((acc, note) => {
      if (!acc[note.category]) acc[note.category] = [];
      acc[note.category].push(note);
      return acc;
    }, {} as Record<string, Note[]>);
    Object.entries(grouped).sort().forEach(([category, categoryNotes]) => {
      markdown += `## ${category}\n\n`;
      categoryNotes.forEach(note => {
        markdown += `### ${note.title}\n\n${note.content}\n\n`;
        if (note.tags.length > 0) markdown += `_Tags: ${note.tags.join(', ')}_${'\n\n'}`;
        markdown += '---\n\n';
      });
    });
    return markdown;
  }
};
