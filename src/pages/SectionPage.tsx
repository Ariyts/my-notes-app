/**
 * Section Page
 * 
 * Universal page component that renders any section based on its type.
 * Uses WorkspaceContext for data access.
 * Handles workspace switching and empty states.
 */

import { useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '../lib/WorkspaceContext';
import { ContentRenderer } from '../components/content-types/ContentRenderer';
import { Terminal, FileText, Database, Link, Table, Plus, FolderPlus } from 'lucide-react';

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
  const navigate = useNavigate();
  const { 
    allSections, 
    sections, 
    activeWorkspaceId,
    activeWorkspace,
    getSectionData, 
    setSectionData,
    addSection,
  } = useWorkspaces();
  
  // Find section in all sections
  const section = allSections.find(s => s.id === sectionId);
  const items = getSectionData(sectionId || '');
  
  // If section belongs to different workspace, show empty state for current workspace
  // (user needs to switch workspace first)
  
  // Redirect to first section of active workspace if current section doesn't belong to it
  useEffect(() => {
    if (!sectionId && sections.length > 0) {
      navigate(`/section/${sections[0].id}`, { replace: true });
    }
  }, [sectionId, sections, navigate]);
  
  // If section doesn't exist, show empty state or redirect
  if (!section) {
    // Check if there are sections in current workspace
    if (sections.length > 0) {
      // Redirect to first section
      return <Navigate to={`/section/${sections[0].id}`} replace />;
    }
    // Show empty workspace state
    return <EmptyWorkspace workspaceName={activeWorkspace?.name || 'Workspace'} />;
  }
  
  // If section belongs to different workspace, still show it
  // (user might have opened a direct link)

  return (
    <ContentRenderer
      section={section}
      items={items}
      onItemsChange={(newItems) => setSectionData(sectionId || '', newItems)}
    />
  );
}

// Empty workspace state
function EmptyWorkspace({ workspaceName }: { workspaceName: string }) {
  const { addSection } = useWorkspaces();
  
  const handleCreateSection = (typeId: string, name: string) => {
    const section = addSection({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name,
      icon: typeId === 'cards' ? 'Terminal' : typeId === 'folders' ? 'FileText' : 'Database',
      typeId: typeId as any,
      isSystem: false,
    });
    // Navigation will happen via useEffect in parent
    window.location.href = `#/section/${section.id}`;
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
        <FolderPlus className="h-8 w-8 text-zinc-500" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">
        {workspaceName} is empty
      </h1>
      <p className="text-zinc-500 mb-6">Create your first section to get started</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
        <button
          onClick={() => handleCreateSection('cards', 'Prompts')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all"
        >
          <Terminal className="h-8 w-8 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-300">Cards</span>
          <span className="text-xs text-zinc-500">Prompts, snippets</span>
        </button>
        
        <button
          onClick={() => handleCreateSection('folders', 'Notes')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-blue-500/50 hover:bg-zinc-800 transition-all"
        >
          <FileText className="h-8 w-8 text-blue-400" />
          <span className="text-sm font-medium text-zinc-300">Folders</span>
          <span className="text-xs text-zinc-500">Notes, docs</span>
        </button>
        
        <button
          onClick={() => handleCreateSection('commands', 'Commands')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-purple-500/50 hover:bg-zinc-800 transition-all"
        >
          <Terminal className="h-8 w-8 text-purple-400" />
          <span className="text-sm font-medium text-zinc-300">Commands</span>
          <span className="text-xs text-zinc-500">CLI snippets</span>
        </button>
        
        <button
          onClick={() => handleCreateSection('links', 'Resources')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-orange-500/50 hover:bg-zinc-800 transition-all"
        >
          <Database className="h-8 w-8 text-orange-400" />
          <span className="text-sm font-medium text-zinc-300">Links</span>
          <span className="text-xs text-zinc-500">Resources, URLs</span>
        </button>
      </div>
      
      <p className="mt-6 text-xs text-zinc-600">
        You can add more sections later using the + button in the sidebar
      </p>
    </div>
  );
}
