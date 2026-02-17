/**
 * Section Page
 * 
 * Universal page component that renders any section based on its type.
 * Replaces individual page components (Prompts, Notes, Snippets, Resources).
 */

import { useParams, Navigate } from 'react-router-dom';
import { useSection, useSections } from '../lib/SectionsContext';
import { ContentRenderer } from '../components/content-types/ContentRenderer';
import { Terminal, FileText, Database, Link, Table } from 'lucide-react';

// Icon map for empty states
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal,
  FileText,
  Database,
  Link,
  Table,
};

export function SectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { section, items, setItems } = useSection(sectionId || '');
  const { sections } = useSections();

  // If section doesn't exist, redirect to first available section
  if (!section) {
    const firstSection = sections[0];
    if (firstSection) {
      return <Navigate to={`/section/${firstSection.id}`} replace />;
    }
    // Fallback if no sections exist
    return <SectionNotFound sectionId={sectionId || ''} />;
  }

  return (
    <ContentRenderer
      section={section}
      items={items}
      onItemsChange={setItems}
    />
  );
}

// Section not found component
function SectionNotFound({ sectionId }: { sectionId: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
        <Terminal className="h-8 w-8 text-zinc-600" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Section Not Found</h1>
      <p className="text-zinc-500">The section "{sectionId}" does not exist.</p>
    </div>
  );
}
