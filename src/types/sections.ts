/**
 * Sections System Types
 * Allows dynamic creation of content sections with different display types
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

// Section configuration
export interface Section {
  id: string;           // Unique ID (used in routes and storage)
  name: string;         // Display name in sidebar
  icon: string;         // Lucide icon name
  typeId: ContentTypeId; // Display type
  config?: {
    categories?: string[];      // Available categories
    fields?: FieldDefinition[]; // Custom fields
    rootFolders?: string[];     // For folders type
    copyField?: string;         // Field to copy (for cards/commands)
    predefinedCategories?: string[]; // For folder paths
  };
  order: number;        // Order in sidebar
  isDefault?: boolean;  // Cannot be deleted
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
