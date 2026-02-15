/**
 * Content Types Management Page
 * Create, edit, delete content types with different display models
 */

import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Terminal,
  StickyNote,
  Database,
  Link as LinkIcon,
  FileText,
  CheckSquare,
  HelpCircle,
  Code,
  LayoutGrid,
  List,
  FolderTree,
  Link2,
  CheckCircle,
  MessageSquare,
  Save,
  X,
  Download,
  Upload,
  Table2,
  Layers,
} from 'lucide-react';
import { useData } from '../lib/DataContext';
import {
  ContentTypeConfig,
  DisplayModel,
  DISPLAY_MODELS,
  FieldDefinition,
} from '../lib/contentTypes';
import { cn } from '../utils/cn';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal,
  StickyNote: StickyNote,
  Database,
  Link: LinkIcon,
  FileText,
  CheckSquare,
  HelpCircle,
  Code,
};

const MODEL_ICONS: Record<DisplayModel, React.ComponentType<{ className?: string }>> = {
  cards: LayoutGrid,
  table: Table2,
  folders: FolderTree,
  list: List,
  links: Link2,
  checklist: CheckCircle,
  faq: MessageSquare,
  commands: Terminal,
};

const MODEL_PREVIEWS: Record<DisplayModel, { title: string; example: string }> = {
  cards: { 
    title: 'Cards Grid', 
    example: '□□□ □□□ □□□\nКаждая карточка с превью содержимого' 
  },
  table: { 
    title: 'Table View', 
    example: '│ Title │ Status │ Tags │\n│ Item1 │ Done   │ test │' 
  },
  folders: { 
    title: 'Folder Tree', 
    example: '📁 Category\n  📄 Note 1\n  📄 Note 2' 
  },
  list: { 
    title: 'Simple List', 
    example: '• Item 1\n• Item 2\n• Item 3' 
  },
  links: { 
    title: 'Link Cards', 
    example: '🔗 Link Title\n   description preview...' 
  },
  checklist: { 
    title: 'Checklist', 
    example: '☐ Todo item\n☑ Done item\n⏳ In progress' 
  },
  faq: { 
    title: 'Q&A Format', 
    example: '❓ Question?\n💬 Answer preview...' 
  },
  commands: { 
    title: 'Commands', 
    example: '> command --flag\nGrouped by tool' 
  },
};

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'zinc', label: 'Gray', class: 'bg-zinc-500' },
];

const ICON_OPTIONS = [
  { value: 'Terminal', label: 'Terminal', icon: Terminal },
  { value: 'StickyNote', label: 'Note', icon: StickyNote },
  { value: 'Database', label: 'Database', icon: Database },
  { value: 'Link', label: 'Link', icon: LinkIcon },
  { value: 'FileText', label: 'File', icon: FileText },
  { value: 'CheckSquare', label: 'Checklist', icon: CheckSquare },
  { value: 'HelpCircle', label: 'Help', icon: HelpCircle },
  { value: 'Code', label: 'Code', icon: Code },
];

export function ContentTypesManager() {
  const { data, contentTypes, getChangelog } = useData();
  const types = data.contentTypes;
  const changelog = getChangelog();

  const [editingType, setEditingType] = useState<ContentTypeConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDelete = (type: ContentTypeConfig) => {
    if (type.isDefault) {
      setMessage({ type: 'error', text: 'Cannot delete default content type' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (confirm(`Delete "${type.name}"? All data in this type will be lost.`)) {
      const success = contentTypes.delete(type.id);
      if (success) {
        setMessage({ type: 'success', text: `"${type.name}" deleted` });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete' });
      }
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Content Types</h1>
          <p className="text-sm text-zinc-500">
            Manage content types and their display models
            {changelog.contentTypes && changelog.contentTypes.length > 0 && (
              <span className="ml-2 text-amber-400">
                ({changelog.contentTypes.length} unsaved changes)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          New Type
        </button>
      </div>

      {message && (
        <div
          className={cn(
            'rounded-lg p-4',
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          )}
        >
          {message.text}
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
        <div className="flex items-start gap-2">
          <Layers className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Content Types</strong> are the building blocks of your vault.
            Choose a display model that fits your data: cards for prompts, folders for notes,
            table for structured data, links for bookmarks, etc.
          </div>
        </div>
      </div>

      {/* Content Types List */}
      <div className="space-y-3">
        {types.map((type) => {
          const IconComponent = ICON_MAP[type.icon] || FileText;
          const ModelIcon = MODEL_ICONS[type.displayModel];
          const colorClass = COLOR_OPTIONS.find(c => c.value === type.color)?.class || 'bg-zinc-500';

          return (
            <div
              key={type.id}
              className={cn(
                'flex items-center gap-4 rounded-xl border bg-zinc-900 p-4 transition-all hover:border-zinc-600',
                type.isDefault ? 'border-zinc-700' : 'border-zinc-800'
              )}
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClass, 'bg-opacity-20')}>
                <IconComponent className={cn('h-5 w-5', `text-${type.color}-400`)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-100">{type.name}</h3>
                  {type.isDefault && (
                    <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">Default</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <ModelIcon className="h-3 w-3" />
                    {DISPLAY_MODELS[type.displayModel].label}
                  </span>
                  <span>{type.fields.length} fields</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingType(type)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(type)}
                  disabled={type.isDefault}
                  className={cn(
                    'rounded-lg p-2',
                    type.isDefault
                      ? 'text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400'
                  )}
                  title={type.isDefault ? 'Cannot delete default' : 'Delete'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingType) && (
        <ContentTypeEditor
          type={editingType}
          onClose={() => {
            setIsCreating(false);
            setEditingType(null);
          }}
          onSave={(config) => {
            if (editingType) {
              contentTypes.update(editingType.id, config);
              setMessage({ type: 'success', text: 'Type updated' });
            } else {
              contentTypes.add(config as Omit<ContentTypeConfig, 'id' | 'createdAt'>);
              setMessage({ type: 'success', text: 'Type created! Publish to save.' });
            }
            setIsCreating(false);
            setEditingType(null);
            setTimeout(() => setMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}

// Content Type Editor Modal with Visual Previews
function ContentTypeEditor({
  type,
  onClose,
  onSave,
}: {
  type: ContentTypeConfig | null;
  onClose: () => void;
  onSave: (config: Partial<ContentTypeConfig>) => void;
}) {
  const [name, setName] = useState(type?.name || '');
  const [icon, setIcon] = useState(type?.icon || 'FileText');
  const [displayModel, setDisplayModel] = useState<DisplayModel>(type?.displayModel || 'cards');
  const [color, setColor] = useState(type?.color || 'emerald');
  const [description, setDescription] = useState(type?.description || '');
  const [fields, setFields] = useState<FieldDefinition[]>(type?.fields || DISPLAY_MODELS.cards.defaultFields);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleModelChange = (model: DisplayModel) => {
    setDisplayModel(model);
    setFields(DISPLAY_MODELS[model].defaultFields);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      icon,
      displayModel,
      color,
      description,
      fields: fields.filter(f => f.name && f.label),
      categoryField: fields.find(f => f.name === 'category' || f.name === 'folder')?.name,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4 z-10">
          <h2 className="text-xl font-bold text-zinc-100">
            {type ? 'Edit Content Type' : 'Create New Content Type'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Name & Icon */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">1. Name & Icon</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 4PDA, Tools, Books..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-1">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setIcon(opt.value)}
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-lg border transition-all',
                        icon === opt.value
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      )}
                      title={opt.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 2: Display Model */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">2. Display Model</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.entries(DISPLAY_MODELS) as [DisplayModel, typeof DISPLAY_MODELS.cards][]).map(([value, config]) => {
                const ModelIcon = MODEL_ICONS[value];
                const preview = MODEL_PREVIEWS[value];
                const isSelected = displayModel === value;

                return (
                  <button
                    key={value}
                    onClick={() => handleModelChange(value)}
                    className={cn(
                      'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ModelIcon className={cn('h-5 w-5', isSelected ? 'text-emerald-400' : 'text-zinc-400')} />
                      <span className={cn('font-medium', isSelected ? 'text-emerald-400' : 'text-zinc-300')}>
                        {config.label}
                      </span>
                    </div>
                    <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap font-mono leading-tight">
                      {preview.example}
                    </pre>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">3. Accent Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'h-10 w-10 rounded-lg border-2 transition-all flex items-center justify-center',
                    c.class,
                    color === c.value ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent'
                  )}
                  title={c.label}
                >
                  {color === c.value && <CheckCircle className="h-5 w-5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Preview</label>
            <div className={cn(
              'rounded-xl border p-4',
              `border-${color}-500/30`,
              `bg-${color}-500/5`
            )}>
              <div className="flex items-center gap-3 mb-3">
                {(() => {
                  const Icon = ICON_MAP[icon] || FileText;
                  return <Icon className={cn('h-6 w-6', `text-${color}-400`)} />;
                })()}
                <span className="text-lg font-semibold text-zinc-100">
                  {name || 'New Type'}
                </span>
                <span className="text-xs text-zinc-500">
                  ({DISPLAY_MODELS[displayModel].label})
                </span>
              </div>
              <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
                {MODEL_PREVIEWS[displayModel].example}
              </pre>
              <div className="mt-3 flex gap-1.5">
                {fields.slice(0, 4).map(f => (
                  <span key={f.name} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced: Fields */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              {showAdvanced ? '▼' : '▶'} Advanced: Customize Fields
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                {fields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={field.name}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[index] = { ...newFields[index], name: e.target.value };
                        setFields(newFields);
                      }}
                      placeholder="name"
                      className="w-24 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100"
                    />
                    <input
                      value={field.label}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[index] = { ...newFields[index], label: e.target.value };
                        setFields(newFields);
                      }}
                      placeholder="Label"
                      className="flex-1 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[index] = { ...newFields[index], type: e.target.value as FieldDefinition['type'] };
                        setFields(newFields);
                      }}
                      className="rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                      <option value="tags">Tags</option>
                      <option value="url">URL</option>
                      <option value="date">Date</option>
                    </select>
                    <button
                      onClick={() => setFields(fields.filter((_, i) => i !== index))}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setFields([...fields, { name: '', label: '', type: 'text' }])}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  <Plus className="h-4 w-4" /> Add field
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this content type"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {type ? 'Update Type' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  );
}
