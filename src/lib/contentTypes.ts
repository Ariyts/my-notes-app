/**
 * Content Type System
 * Dynamic content types with different display models
 */

// Display models for content types
export type DisplayModel = 
  | 'cards'        // Like prompts - card grid with preview
  | 'table'        // Table view with columns
  | 'folders'      // Like notes - hierarchical folder structure
  | 'list'         // Simple list like snippets
  | 'links'        // Like resources - link cards
  | 'checklist'    // Checklist with checkboxes
  | 'faq'          // Q&A format
  | 'commands';    // Command snippets with tool grouping

// Field definition for content type
export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'tags' | 'url' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  default?: string;
}

// Content Type Configuration
export interface ContentTypeConfig {
  id: string;
  name: string;
  icon: string;           // Lucide icon name
  displayModel: DisplayModel;
  fields: FieldDefinition[];
  categoryField?: string; // Which field to use for categories/folders
  color?: string;         // Accent color (tailwind class)
  description?: string;
  isDefault?: boolean;    // Can't be deleted
  createdAt: string;
}

// Predefined display model templates
export const DISPLAY_MODELS: Record<DisplayModel, {
  label: string;
  description: string;
  defaultFields: FieldDefinition[];
}> = {
  cards: {
    label: 'Cards',
    description: 'Card grid with preview, like Prompts',
    defaultFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'content', label: 'Content', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'select', options: [], default: 'general' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
  },
  table: {
    label: 'Table',
    description: 'Tabular data with custom columns',
    defaultFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'done'], default: 'pending' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
  },
  folders: {
    label: 'Folders',
    description: 'Hierarchical notes with folders, like Notes',
    defaultFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'content', label: 'Content', type: 'textarea', required: true },
      { name: 'category', label: 'Folder Path', type: 'text', placeholder: 'e.g., Web/XSS', default: 'General' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
  },
  list: {
    label: 'List',
    description: 'Simple list items, like Snippets',
    defaultFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'command', label: 'Command', type: 'textarea', required: true },
      { name: 'tool', label: 'Tool', type: 'text', default: 'other' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
  },
  links: {
    label: 'Links',
    description: 'Link collection, like Resources',
    defaultFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'url', label: 'URL', type: 'url', required: true },
      { name: 'category', label: 'Category', type: 'select', options: [], default: 'general' },
      { name: 'note', label: 'Note', type: 'textarea' },
    ],
  },
  checklist: {
    label: 'Checklist',
    description: 'Tasks with checkboxes and status',
    defaultFields: [
      { name: 'title', label: 'Task', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['todo', 'in-progress', 'done'], default: 'todo' },
      { name: 'category', label: 'Section', type: 'text', default: 'General' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'], default: 'medium' },
    ],
  },
  faq: {
    label: 'FAQ',
    description: 'Question-Answer format',
    defaultFields: [
      { name: 'title', label: 'Question', type: 'text', required: true },
      { name: 'content', label: 'Answer', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'text', default: 'General' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
  },
  commands: {
    label: 'Commands',
    description: 'Terminal commands grouped by tool',
    defaultFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'command', label: 'Command', type: 'textarea', required: true },
      { name: 'tool', label: 'Tool', type: 'text', required: true, default: 'bash' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
  },
};

// Default content types (existing ones)
export const DEFAULT_CONTENT_TYPES: ContentTypeConfig[] = [
  {
    id: 'prompts',
    name: 'Prompts',
    icon: 'Terminal',
    displayModel: 'cards',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'content', label: 'Prompt', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['recon', 'exploit', 'privesc', 'persistence', 'evasion', 'reporting', 'social', 'other'], default: 'other' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
    categoryField: 'category',
    color: 'emerald',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notes',
    name: 'Notes',
    icon: 'StickyNote',
    displayModel: 'folders',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'content', label: 'Content', type: 'textarea', required: true },
      { name: 'category', label: 'Folder', type: 'text', default: 'General' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
    categoryField: 'category',
    color: 'blue',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'snippets',
    name: 'Snippets',
    icon: 'Database',
    displayModel: 'commands',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'command', label: 'Command', type: 'textarea', required: true },
      { name: 'tool', label: 'Tool', type: 'text', required: true, default: 'bash' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'tags', label: 'Tags', type: 'tags' },
    ],
    categoryField: 'tool',
    color: 'purple',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'resources',
    name: 'Resources',
    icon: 'Link',
    displayModel: 'links',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'url', label: 'URL', type: 'url', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['tools', 'cheatsheets', 'wordlists', 'payloads', 'exploits', 'learning', 'blogs', 'labs', 'ctf', 'other'], default: 'other' },
      { name: 'note', label: 'Note', type: 'textarea' },
    ],
    categoryField: 'category',
    color: 'orange',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

// Content item - generic type that can hold any fields
export interface ContentItem {
  id: string;
  contentTypeId: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

// Helper to get icon component name
export function getIconComponent(iconName: string): string {
  return iconName;
}

// Generate unique ID
export function generateContentId(): string {
  return `content-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Generate content type ID from name
export function generateContentTypeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
