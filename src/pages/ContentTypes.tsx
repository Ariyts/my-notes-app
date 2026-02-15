/**
 * Content Types Management Page
 * Create, edit, delete content types with different display models
 */

import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Terminal,
  StickyNote,
  Database,
  Link,
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
  Terminal as TerminalIcon,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
} from 'lucide-react';
import { useContentTypes } from '../lib/ContentTypesContext';
import {
  ContentTypeConfig,
  DisplayModel,
  DISPLAY_MODELS,
} from '../lib/contentTypes';
import { cn } from '../utils/cn';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal,
  StickyNote: StickyNote,
  Database,
  Link,
  FileText,
  CheckSquare,
  HelpCircle,
  Code,
};

const MODEL_ICONS: Record<DisplayModel, React.ComponentType<{ className?: string }>> = {
  cards: LayoutGrid,
  table: List,
  folders: FolderTree,
  list: List,
  links: Link2,
  checklist: CheckCircle,
  faq: MessageSquare,
  commands: TerminalIcon,
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

export function ContentTypesManager() {
  const { types, addType, updateType, deleteType, exportTypes, importTypes } = useContentTypes();
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
      deleteType(type.id);
      setMessage({ type: 'success', text: `"${type.name}" deleted` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExport = () => {
    const json = exportTypes();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-types-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        importTypes(event.target?.result as string);
        setMessage({ type: 'success', text: 'Content types imported' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to import' });
      }
      setTimeout(() => setMessage(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Content Types</h1>
          <p className="text-sm text-zinc-500">Manage content types and their display models</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 cursor-pointer">
            <Upload className="h-4 w-4" />
            Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            New Type
          </button>
        </div>
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
                  {type.description && (
                    <span className="truncate max-w-[200px]">{type.description}</span>
                  )}
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
              updateType(editingType.id, config);
            } else {
              addType(config as Omit<ContentTypeConfig, 'id' | 'createdAt'>);
            }
            setIsCreating(false);
            setEditingType(null);
            setMessage({ type: 'success', text: editingType ? 'Type updated' : 'Type created' });
            setTimeout(() => setMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}

// Content Type Editor Modal
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
  const [fields, setFields] = useState(type?.fields || DISPLAY_MODELS.cards.defaultFields);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  const handleModelChange = (model: DisplayModel) => {
    setDisplayModel(model);
    // Reset fields to default for this model
    setFields(DISPLAY_MODELS[model].defaultFields);
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      { name: '', label: '', type: 'text', required: false },
    ]);
  };

  const handleUpdateField = (index: number, updates: Partial<typeof fields[0]>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
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
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <h2 className="text-xl font-bold text-zinc-100">
            {type ? 'Edit Content Type' : 'New Content Type'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 4PDA"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Icon</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {Object.keys(ICON_MAP).map((iconName) => {
                  const Icon = ICON_MAP[iconName];
                  return (
                    <option key={iconName} value={iconName}>
                      {iconName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Display Model</label>
              <select
                value={displayModel}
                onChange={(e) => handleModelChange(e.target.value as DisplayModel)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {Object.entries(DISPLAY_MODELS).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'h-10 w-10 rounded-lg border-2 transition-all',
                      c.class,
                      color === c.value ? 'border-white scale-110' : 'border-transparent'
                    )}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Fields Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-400">Fields</label>
              <button
                onClick={() => setShowFieldEditor(!showFieldEditor)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                {showFieldEditor ? 'Hide' : 'Customize'} fields
                {showFieldEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {showFieldEditor ? (
              <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                {fields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={field.name}
                      onChange={(e) => handleUpdateField(index, { name: e.target.value })}
                      placeholder="Field name"
                      className="flex-1 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100"
                    />
                    <input
                      value={field.label}
                      onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                      placeholder="Label"
                      className="flex-1 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(index, { type: e.target.value as FieldDefinition['type'] })}
                      className="rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-100"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                      <option value="tags">Tags</option>
                      <option value="url">URL</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                        className="rounded border-zinc-600"
                      />
                      Req
                    </label>
                    <button
                      onClick={() => handleRemoveField(index)}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  Add field
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fields.map((field) => (
                  <span
                    key={field.name}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Model Preview */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4">
            <div className="text-xs text-zinc-500 mb-2">Preview: {DISPLAY_MODELS[displayModel].description}</div>
            <div className="text-sm text-zinc-400">
              Items will be displayed as <strong className="text-zinc-200">{DISPLAY_MODELS[displayModel].label}</strong>
            </div>
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

import { FieldDefinition } from '../lib/contentTypes';
