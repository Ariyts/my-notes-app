/**
 * Default Sections Configuration
 * 
 * These sections are created by default and map to existing functionality.
 * Each section references a content type (display model) and configuration.
 */

import { Section } from '../types/sections';

export const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'prompts',
    name: 'Prompts',
    icon: 'Terminal',
    typeId: 'cards',
    workspaceId: 'default',
    config: {
      categories: ['recon', 'exploit', 'privesc', 'persistence', 'evasion', 'reporting', 'social', 'other'],
      copyField: 'content',
    },
    order: 0,
    isDefault: true,
  },
  {
    id: 'notes',
    name: 'Pentest Notes',
    icon: 'FileText',
    typeId: 'folders',
    workspaceId: 'default',
    config: {
      rootFolders: ['Web', 'Network', 'Active Directory', 'Cloud', 'Mobile', 'Methodology'],
      predefinedCategories: [
        'Web/Recon',
        'Web/Auth Bypass',
        'Web/XSS',
        'Web/SQLi',
        'Web/SSRF',
        'Web/CSRF',
        'Web/File Upload',
        'Network/Scanning',
        'Network/Exploitation',
        'Active Directory/Enumeration',
        'Active Directory/Kerberos',
        'Active Directory/Lateral Movement',
        'Cloud/AWS',
        'Cloud/Azure',
        'Cloud/GCP',
        'Mobile/Android',
        'Mobile/iOS',
        'Methodology/General',
        'Methodology/Reporting',
      ],
    },
    order: 1,
    isDefault: true,
  },
  {
    id: 'snippets',
    name: 'Snippets',
    icon: 'Database',
    typeId: 'commands',
    workspaceId: 'default',
    config: {
      copyField: 'command',
    },
    order: 2,
    isDefault: true,
  },
  {
    id: 'resources',
    name: 'Resources',
    icon: 'Link',
    typeId: 'links',
    workspaceId: 'default',
    config: {
      categories: ['tools', 'cheatsheets', 'wordlists', 'payloads', 'exploits', 'learning', 'blogs', 'labs', 'ctf', 'other'],
    },
    order: 3,
    isDefault: true,
  },
];

// Storage key for sections configuration
export const SECTIONS_STORAGE_KEY = 'pentest-hub-sections';

// Storage key prefix for section data
export const SECTION_DATA_PREFIX = 'section-data-';

// Legacy storage keys (for migration)
export const LEGACY_KEYS = {
  prompts: 'pentest_prompts',
  notes: 'pentest_notes',
  snippets: 'pentest_snippets',
  resources: 'pentest_resources',
};

// Migration flag key
export const MIGRATION_FLAG_KEY = 'pentest-hub-migrated-v2';
