/**
 * Section Page
 * 
 * Universal page component that renders any section based on its type.
 * Uses WorkspaceContext for data access.
 */

import { useParams, Navigate } from 'react-router-dom';
import { useWorkspaces } from '../lib/WorkspaceContext';
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
  const { 
    allSections, 
    sections, 
    activeWorkspaceId,
    getSectionData, 
    setSectionData 
  } = useWorkspaces();
  
  // Find section in all sections (not just active workspace)
  const section = allSections.find(s => s.id === sectionId);
  const items = getSectionData(sectionId || '');
  
  // If section doesn't exist, redirect to first section of active workspace
  if (!section) {
    const firstSection = sections[0];
    if (firstSection) {
      return <Navigate to={`/section/${firstSection.id}`} replace />;
    }
    // Fallback if no sections exist
    return <SectionNotFound sectionId={sectionId || ''} />;
  }
  
  // If section belongs to different workspace, we still show it
  // (user might have opened a direct link)

  return (
    <ContentRenderer
      section={section}
      items={items}
      onItemsChange={(newItems) => setSectionData(sectionId || '', newItems)}
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
