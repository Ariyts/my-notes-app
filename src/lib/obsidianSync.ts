/**
 * Obsidian Sync Module
 * Export/Import notes in Obsidian-compatible markdown format
 * with YAML frontmatter and folder structure
 */

import { Note } from '../types';

/**
 * Convert a note to Obsidian-compatible markdown with YAML frontmatter
 */
export function noteToMarkdown(note: Note): string {
  const frontmatter = `---
id: "${note.id}"
title: "${escapeYamlString(note.title)}"
category: "${note.category}"
tags: [${note.tags.map(t => `"${escapeYamlString(t)}"`).join(', ')}]
updatedAt: "${note.updatedAt}"
created: "${note.updatedAt}"
---

`;

  return frontmatter + note.content;
}

/**
 * Parse Obsidian markdown to Note object
 */
export function markdownToNote(markdown: string, defaultCategory: string = 'Imported'): Partial<Note> {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    // No frontmatter - treat entire content as note
    const lines = markdown.split('\n');
    const titleLine = lines.find(l => l.startsWith('# '));
    return {
      id: generateId(),
      title: titleLine ? titleLine.replace('# ', '').trim() : 'Untitled',
      category: defaultCategory,
      content: markdown,
      tags: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const [, frontmatterText, content] = match;
  const frontmatter = parseFrontmatter(frontmatterText);

  return {
    id: frontmatter.id || generateId(),
    title: frontmatter.title || 'Untitled',
    category: frontmatter.category || defaultCategory,
    content: content.trim(),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    updatedAt: frontmatter.updatedAt || new Date().toISOString(),
  };
}

/**
 * Parse YAML frontmatter string to object
 */
function parseFrontmatter(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Parse arrays [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .slice(1, -1)
        .split(',')
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      result[key] = items;
    }
    // Parse quoted strings
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      result[key] = value.slice(1, -1);
    }
    // Parse other values
    else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Escape special characters in YAML strings
 */
function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get folder path from category (e.g., "Web/XSS" -> "Web/XSS")
 */
export function categoryToPath(category: string): string {
  return category.replace(/[^a-zA-Z0-9а-яА-ЯёЁ/_-]/g, '_');
}

/**
 * Get filename for a note
 */
export function getNoteFilename(note: Note): string {
  const sanitizedTitle = note.title
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${sanitizedTitle}.md`;
}

/**
 * Get full path for a note (folder/filename)
 */
export function getNotePath(note: Note): string {
  const folder = categoryToPath(note.category);
  const filename = getNoteFilename(note);
  return folder ? `${folder}/${filename}` : filename;
}

/**
 * Export all notes as a map of path -> content
 * Ready for ZIP download or file system writing
 */
export function exportNotesToFiles(notes: Note[]): Map<string, string> {
  const files = new Map<string, string>();

  for (const note of notes) {
    const path = getNotePath(note);
    const content = noteToMarkdown(note);
    files.set(path, content);
  }

  return files;
}

/**
 * Create a downloadable ZIP file with all notes
 * Uses JSZip library if available, otherwise returns individual files
 */
export async function createNotesArchive(notes: Note[]): Promise<Blob> {
  // Dynamic import of JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const files = exportNotesToFiles(notes);

  for (const [path, content] of files) {
    zip.file(path, content);
  }

  // Add README
  zip.file('README.md', `# Notes Export

Exported from Pentest Hub on ${new Date().toLocaleDateString()}

## Structure
Notes are organized by category into folders.
Each note file contains YAML frontmatter with metadata.

## Import
To import these notes back, use the Import feature in Settings.
Select multiple .md files or a ZIP archive.

## Total Notes: ${notes.length}
`);

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Import notes from multiple markdown files
 */
export function importNotesFromFiles(files: FileList): Promise<Partial<Note>[]> {
  return new Promise((resolve) => {
    const notes: Partial<Note>[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        // Extract category from path if possible
        const pathParts = file.webkitRelativePath?.split('/') || [];
        let category = 'Imported';

        // If file is in a subfolder, use that as category
        if (pathParts.length > 1) {
          category = pathParts.slice(0, -1).join('/');
        }

        const note = markdownToNote(content, category);
        notes.push(note);

        processed++;
        if (processed === files.length) {
          resolve(notes);
        }
      };

      reader.onerror = () => {
        processed++;
        if (processed === files.length) {
          resolve(notes);
        }
      };

      reader.readAsText(file);
    });
  });
}

/**
 * Import notes from a ZIP archive
 */
export async function importNotesFromZip(zipFile: File): Promise<Partial<Note>[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipFile);

  const notes: Partial<Note>[] = [];
  const mdFiles = Object.keys(zip.files).filter(
    name => name.endsWith('.md') && !name.includes('README')
  );

  for (const filename of mdFiles) {
    const content = await zip.files[filename].async('text');

    // Extract category from path
    const pathParts = filename.split('/');
    let category = 'Imported';

    if (pathParts.length > 1) {
      // Remove filename, use rest as category
      category = pathParts.slice(0, -1).join('/');
    }

    const note = markdownToNote(content, category);
    notes.push(note);
  }

  return notes;
}

/**
 * Detect if content has Obsidian-style wikilinks
 */
export function hasWikilinks(content: string): boolean {
  return /\[\[.*?\]\]/.test(content);
}

/**
 * Convert wikilinks to regular markdown links
 */
export function convertWikilinks(content: string): string {
  return content.replace(/\[\[(.*?)\]\]/g, (_, link) => {
    const [page, label] = link.split('|');
    return `[${label || page}](${page}.md)`;
  });
}

/**
 * Convert regular markdown links to wikilinks
 */
export function convertToWikilinks(content: string): string {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\.md\)/g, (_, label, page) => {
    if (label === page) {
      return `[[${page}]]`;
    }
    return `[[${page}|${label}]]`;
  });
}
