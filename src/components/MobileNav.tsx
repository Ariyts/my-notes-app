import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Terminal, 
  StickyNote, 
  Link as LinkIcon, 
  Database,
  Settings,
  Menu,
  X,
  Search
} from 'lucide-react';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { path: '/', label: 'Prompts', icon: Terminal },
  { path: '/notes', label: 'Notes', icon: StickyNote },
  { path: '/snippets', label: 'Snippets', icon: Database },
  { path: '/resources', label: 'Resources', icon: LinkIcon },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface MobileNavProps {
  onOpenSearch: () => void;
}

export function MobileNav({ onOpenSearch }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-zinc-100">Pentest Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-64 bg-zinc-900 shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <span className="font-semibold text-zinc-100">Menu</span>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-emerald-600/10 text-emerald-400" 
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
