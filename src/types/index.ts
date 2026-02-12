export type Category = 'recon' | 'exploit' | 'privesc' | 'reporting' | 'other' | string;

export interface Prompt {
  id: string;
  title: string;
  category: Category;
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  category: string; // Hierarchical path e.g., "Web/Recon"
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface Snippet {
  id: string;
  title: string;
  command: string;
  tool: string; // e.g., 'nmap', 'ffuf'
  description?: string;
  tags: string[];
}

export interface Resource {
  id: string;
  url: string;
  title: string;
  category: string;
  note?: string;
}
