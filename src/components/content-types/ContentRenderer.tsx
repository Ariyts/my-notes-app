/**
 * Content Renderer
 * 
 * Renders the appropriate content view component based on section type.
 * This is the main router for the content type system.
 */

import { Section, SectionItem } from '../../types/sections';
import { CardsView } from './CardsView';
import { FoldersView } from './FoldersView';
import { CommandsView } from './CommandsView';
import { LinksView } from './LinksView';
import { TableView } from './TableView';

interface ContentRendererProps {
  section: Section;
  items: SectionItem[];
  onItemsChange: (items: SectionItem[]) => void;
}

export function ContentRenderer({ section, items, onItemsChange }: ContentRendererProps) {
  const commonProps = {
    section,
    items,
    onItemsChange,
  };

  switch (section.typeId) {
    case 'cards':
      return <CardsView {...commonProps} />;
    
    case 'folders':
      return <FoldersView {...commonProps} />;
    
    case 'commands':
      return <CommandsView {...commonProps} />;
    
    case 'links':
      return <LinksView {...commonProps} />;
    
    case 'table':
      return <TableView {...commonProps} />;
    
    default:
      return (
        <div className="p-8 text-center">
          <p className="text-zinc-400">Unknown content type: {section.typeId}</p>
        </div>
      );
  }
}
