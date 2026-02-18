/**
 * Sections System Types
 * Allows dynamic creation of content sections with different display types
 * Supports Workspaces for organizing sections into separate contexts
 */

// Content Type ID - defines how content is displayed
export type ContentTypeId = 'folders' | 'cards' | 'commands' | 'links' | 'table';

// Field definition for dynamic content
export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'tags' | 'url' | 'date' | 'markdown';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  default?: string;
}

// Workspace - top level container for sections
export interface Workspace {
  id: string;
  name: string;
  color: string;           // hex or preset color
  icon: string;            // Lucide icon name
  isDefault?: boolean;     // Cannot be deleted (first workspace)
  order: number;           // Order in tabs
  createdAt: string;
  updatedAt: string;
}

// Section configuration
export interface Section {
  id: string;           // Unique ID (used in routes and storage)
  workspaceId: string;  // ← NEW: Belongs to workspace
  name: string;         // Display name in sidebar
  icon: string;         // Lucide icon name
  color?: string;       // ← NEW: Section color (for sidebar)
  typeId: ContentTypeId; // Display type
  config?: {
    categories?: string[];      // Available categories
    fields?: FieldDefinition[]; // Custom fields
    rootFolders?: string[];     // For folders type
    copyField?: string;         // Field to copy (for cards/commands)
    predefinedCategories?: string[]; // For folder paths
  };
  order: number;        // Order in sidebar
  isDefault?: boolean;  // Cannot be deleted (legacy, use isSystem)
  isSystem?: boolean;   // ← NEW: System section (protected, editable but not deletable)
  createdAt?: string;
}

// Generic content item - works with any section
export interface SectionItem {
  id: string;
  sectionId: string;
  data: Record<string, unknown>; // Dynamic fields based on section config
  tags: string[];
  updatedAt: string;
}

// Section management
export interface SectionConfig {
  sections: Section[];
  lastUpdated: string;
}

// App-wide data structure for sync
export interface AppData {
  version: string;
  exportedAt: string;
  workspaces: Workspace[];
  sections: Section[];
  items: Record<string, SectionItem[]>;
  activeWorkspaceId: string;
  settings?: AppSettings;
}

// App settings
export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  [key: string]: unknown;
}
