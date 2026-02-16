import { X } from 'lucide-react';
import { NOTE_TEMPLATES, NoteTemplate } from '../lib/templates';
import { cn } from '../utils/cn';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: NoteTemplate) => void;
}

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  if (!isOpen) return null;

  // Group templates by category prefix
  const grouped = NOTE_TEMPLATES.reduce((acc, template) => {
    const prefix = template.category.split('/')[0];
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(template);
    return acc;
  }, {} as Record<string, NoteTemplate[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Choose a Template</h2>
            <p className="text-sm text-zinc-500">Start with a pre-filled structure</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {Object.entries(grouped).map(([category, templates]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                {category}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelect(template);
                      onClose();
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-left transition-all",
                      "hover:border-emerald-500/50 hover:bg-zinc-800"
                    )}
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-100">{template.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{template.category}</div>
                      <div className="mt-2 text-xs text-zinc-600 line-clamp-2">
                        {template.content.split('\n').slice(0, 3).join(' ').slice(0, 80)}...
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 px-6 py-3">
          <p className="text-center text-xs text-zinc-600">
            Templates provide a starting structure. You can fully customize after creation.
          </p>
        </div>
      </div>
    </div>
  );
}
