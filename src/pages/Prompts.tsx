import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Copy, Tag, Edit2, Trash2, Check, Filter, Grid, List, Table2, Star, StarOff, GripVertical, X, Pencil, Settings2 } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useData } from '../lib/DataContext';
import { Prompt } from '../types';
import { cn } from '../utils/cn';

// Default categories with colors
const DEFAULT_CATEGORIES = [
  { value: 'recon', label: 'Recon', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'exploit', label: 'Exploit', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'privesc', label: 'PrivEsc', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'persistence', label: 'Persistence', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'evasion', label: 'Evasion', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { value: 'reporting', label: 'Reporting', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'social', label: 'Social Eng', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
];

const getCategoryStyle = (category: string) => {
  return DEFAULT_CATEGORIES.find(c => c.value === category)?.color || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1].color;
};

type ViewMode = 'grid' | 'list' | 'table';

// Inline Edit Component
function InlineEdit({ 
  value, 
  onSave, 
  onCancel,
  placeholder = "Enter text...",
  className = "",
  multiline = false,
}: {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (multiline) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded bg-zinc-700 px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          rows={3}
        />
        <div className="flex gap-1">
          <button onClick={handleSave} className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500">
            <Check className="h-3 w-3" />
          </button>
          <button onClick={onCancel} className="rounded bg-zinc-700 p-1 text-zinc-300 hover:bg-zinc-600">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-0 rounded bg-zinc-700 px-2 py-0.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <button onClick={handleSave} className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500 shrink-0">
        <Check className="h-3 w-3" />
      </button>
      <button onClick={onCancel} className="rounded bg-zinc-700 p-1 text-zinc-300 hover:bg-zinc-600 shrink-0">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Tag Editor Component
function TagEditor({ 
  tags, 
  onSave,
  allTags,
}: {
  tags: string[];
  onSave: (tags: string[]) => void;
  allTags: string[];
}) {
  const [editTags, setEditTags] = useState<string[]>(tags);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const handleSave = () => {
    onSave(editTags);
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-zinc-800 border border-zinc-700 min-w-[200px]">
      <div className="flex flex-wrap gap-1">
        {editTags.map(tag => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
            <Tag className="h-2.5 w-2.5" />
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1 text-zinc-500 hover:text-red-400">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag..."
          list="all-tags"
          className="flex-1 rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button onClick={addTag} className="rounded bg-zinc-700 p-1 text-zinc-400 hover:text-emerald-400">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      
      <datalist id="all-tags">
        {allTags.filter(t => !editTags.includes(t)).map(tag => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      
      <div className="flex justify-end gap-1 pt-1 border-t border-zinc-700">
        <button onClick={handleSave} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500">
          Save
        </button>
      </div>
    </div>
  );
}

// Sortable Prompt Card for Grid/List views
function SortablePromptCard({ 
  prompt, 
  isFavorite,
  isCopied,
  onCopy, 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onTagClick,
  onRename,
  onEditTags,
  viewMode,
  titleMaxWidth,
  allTags,
}: {
  prompt: Prompt;
  isFavorite: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onTagClick: (tag: string) => void;
  onRename: (newTitle: string) => void;
  onEditTags: (tags: string[]) => void;
  viewMode: 'grid' | 'list';
  titleMaxWidth: number;
  allTags: string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prompt.id });

  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-zinc-900 transition-all hover:border-zinc-600",
        isFavorite ? "border-amber-500/30" : "border-zinc-800",
        isDragging && "opacity-50 scale-105 z-50"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFavorite}
                className="shrink-0 text-zinc-600 hover:text-amber-400"
              >
                {isFavorite 
                  ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  : <StarOff className="h-4 w-4" />
                }
              </button>
              {isRenaming ? (
                <InlineEdit
                  value={prompt.title}
                  onSave={(newTitle) => { onRename(newTitle); setIsRenaming(false); }}
                  onCancel={() => setIsRenaming(false)}
                  placeholder="Prompt title..."
                  className="flex-1"
                />
              ) : (
                <h3 
                  className="font-semibold text-zinc-100 cursor-pointer hover:text-emerald-400 transition-colors"
                  style={{ maxWidth: titleMaxWidth }}
                  onClick={onEdit}
                  title={prompt.title}
                >
                  <span className="block truncate">{prompt.title}</span>
                </h3>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={cn("rounded-md border px-2 py-0.5 font-medium", getCategoryStyle(prompt.category))}>
                {prompt.category}
              </span>
              <span className="text-zinc-500">
                {new Date(prompt.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => setIsRenaming(true)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400 opacity-0 group-hover:opacity-100"
              title="Rename"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button 
              onClick={onCopy}
              className={cn(
                "rounded-lg p-2 transition-colors",
                isCopied 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
              )}
              title="Copy Prompt"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button 
              onClick={onEdit}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400 opacity-0 group-hover:opacity-100"
              title="Edit Content"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button 
              onClick={onDelete}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 opacity-0 group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Prompt Content with Copy Button */}
        <div className="mt-3 relative group/content">
          <div 
            className="cursor-pointer rounded-lg bg-zinc-950 p-3 text-sm text-zinc-300 font-mono overflow-hidden hover:bg-zinc-950/80 transition-colors"
            onClick={onCopy}
          >
            <pre className={cn(
              "whitespace-pre-wrap break-words",
              viewMode === 'grid' ? "line-clamp-4" : "line-clamp-3"
            )}>{prompt.content}</pre>
          </div>
          <button
            onClick={onCopy}
            className={cn(
              "absolute top-2 right-2 rounded-lg p-2 transition-all",
              isCopied
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800/80 text-zinc-400 hover:text-emerald-400 opacity-0 group-hover/content:opacity-100"
            )}
            title="Copy"
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Tags */}
        {(prompt.tags.length > 0 || isEditingTags) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {isEditingTags ? (
              <TagEditor
                tags={prompt.tags}
                onSave={(tags) => { onEditTags(tags); setIsEditingTags(false); }}
                allTags={allTags}
              />
            ) : (
              <>
                {prompt.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-700"
                    onClick={() => onTagClick(tag)}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
                <button
                  onClick={() => setIsEditingTags(true)}
                  className="rounded-full bg-zinc-800/50 p-1 text-zinc-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100"
                  title="Edit tags"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Add tags button if no tags */}
        {prompt.tags.length === 0 && !isEditingTags && (
          <button
            onClick={() => setIsEditingTags(true)}
            className="mt-3 flex items-center gap-1 rounded-full bg-zinc-800/50 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100"
          >
            <Plus className="h-3 w-3" />
            Add tags
          </button>
        )}
      </div>
    </div>
  );
}

// Table Row Component
function PromptTableRow({
  prompt,
  isFavorite,
  isCopied,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTagClick,
  onRename,
  onEditTags,
  titleMaxWidth,
  allTags,
}: {
  prompt: Prompt;
  isFavorite: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onTagClick: (tag: string) => void;
  onRename: (newTitle: string) => void;
  onEditTags: (tags: string[]) => void;
  titleMaxWidth: number;
  allTags: string[];
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);

  return (
    <tr className="group border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
      <td className="py-2 px-3">
        <button
          onClick={onToggleFavorite}
          className="text-zinc-600 hover:text-amber-400"
        >
          {isFavorite 
            ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            : <StarOff className="h-4 w-4" />
          }
        </button>
      </td>
      <td className="py-2 px-3">
        {isRenaming ? (
          <InlineEdit
            value={prompt.title}
            onSave={(newTitle) => { onRename(newTitle); setIsRenaming(false); }}
            onCancel={() => setIsRenaming(false)}
            placeholder="Title..."
          />
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="text-left text-zinc-100 hover:text-emerald-400 font-medium truncate block"
              style={{ maxWidth: titleMaxWidth }}
              title={prompt.title}
            >
              {prompt.title}
            </button>
            <button
              onClick={() => setIsRenaming(true)}
              className="p-1 text-zinc-500 hover:text-blue-400 opacity-0 group-hover:opacity-100"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </td>
      <td className="py-2 px-3">
        <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", getCategoryStyle(prompt.category))}>
          {prompt.category}
        </span>
      </td>
      <td className="py-2 px-3 relative group/content">
        <div 
          className="flex items-center gap-1"
          onClick={onCopy}
        >
          <span className="text-zinc-500 text-xs truncate block cursor-pointer hover:text-zinc-300" style={{ maxWidth: 200 }}>
            {prompt.content.substring(0, 50)}...
          </span>
          <button
            onClick={onCopy}
            className={cn(
              "p-1 rounded transition-all",
              isCopied ? "text-emerald-400" : "text-zinc-500 hover:text-emerald-400 opacity-0 group-hover/content:opacity-100"
            )}
          >
            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </td>
      <td className="py-2 px-3">
        {isEditingTags ? (
          <TagEditor
            tags={prompt.tags}
            onSave={(tags) => { onEditTags(tags); setIsEditingTags(false); }}
            allTags={allTags}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {prompt.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="cursor-pointer rounded-full bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-600"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-xs text-zinc-500">+{prompt.tags.length - 3}</span>
            )}
            <button
              onClick={() => setIsEditingTags(true)}
              className="p-0.5 text-zinc-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </td>
      <td className="py-2 px-3 text-zinc-500 text-xs whitespace-nowrap">
        {new Date(prompt.updatedAt).toLocaleDateString()}
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onCopy}
            className={cn(
              "rounded p-1.5 transition-colors",
              isCopied
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400"
            )}
            title="Copy"
          >
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-blue-400"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Compact List Item
function PromptCompactItem({
  prompt,
  isFavorite,
  isCopied,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTagClick,
  onRename,
  onEditTags,
  titleMaxWidth,
  allTags,
}: {
  prompt: Prompt;
  isFavorite: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onTagClick: (tag: string) => void;
  onRename: (newTitle: string) => void;
  onEditTags: (tags: string[]) => void;
  titleMaxWidth: number;
  allTags: string[];
}) {
  const [isRenaming, setIsRenaming] = useState(false);

  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all">
      {/* Favorite */}
      <button
        onClick={onToggleFavorite}
        className="shrink-0 text-zinc-600 hover:text-amber-400"
      >
        {isFavorite 
          ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          : <StarOff className="h-4 w-4" />
        }
      </button>

      {/* Title */}
      {isRenaming ? (
        <InlineEdit
          value={prompt.title}
          onSave={(newTitle) => { onRename(newTitle); setIsRenaming(false); }}
          onCancel={() => setIsRenaming(false)}
          placeholder="Title..."
          className="flex-1"
        />
      ) : (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            onClick={onEdit}
            className="text-left text-zinc-100 hover:text-emerald-400 font-medium truncate"
            style={{ maxWidth: titleMaxWidth }}
          >
            {prompt.title}
          </button>
          <button
            onClick={() => setIsRenaming(true)}
            className="p-1 text-zinc-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Category */}
      <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium", getCategoryStyle(prompt.category))}>
        {prompt.category}
      </span>

      {/* Tags - simplified for compact view */}
      <div className="hidden sm:flex flex-wrap gap-1 max-w-[150px]">
        {prompt.tags.slice(0, 2).map(tag => (
          <span
            key={tag}
            className="cursor-pointer rounded-full bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-600"
            onClick={() => onTagClick(tag)}
          >
            {tag}
          </span>
        ))}
        {prompt.tags.length > 2 && (
          <span className="text-xs text-zinc-500">+{prompt.tags.length - 2}</span>
        )}
      </div>

      {/* Date */}
      <span className="hidden md:block text-zinc-500 text-xs whitespace-nowrap">
        {new Date(prompt.updatedAt).toLocaleDateString()}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onCopy}
          className={cn(
            "rounded p-1.5 transition-colors",
            isCopied
              ? "bg-emerald-500/10 text-emerald-400"
              : "text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400"
          )}
          title="Copy"
        >
          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-blue-400"
          title="Edit"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// New Prompt Inline Form
function NewPromptForm({ 
  onSave, 
  onCancel,
  allTags,
}: {
  onSave: (data: { title: string; category: string; content: string; tags: string[] }) => void;
  onCancel: () => void;
  allTags: string[];
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = () => {
    if (title.trim() && content.trim()) {
      onSave({ title: title.trim(), category, content: content.trim(), tags });
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
        <Plus className="h-4 w-4" />
        New Prompt
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prompt title..."
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
        >
          {DEFAULT_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter your prompt content..."
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
        rows={5}
      />
      
      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
            <Tag className="h-2.5 w-2.5" />
            {tag}
            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-1 text-zinc-500 hover:text-red-400">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
            placeholder="Add tag..."
            list="all-tags-new"
            className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button onClick={addTag} className="text-zinc-400 hover:text-emerald-400">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <datalist id="all-tags-new">
          {allTags.filter(t => !tags.includes(t)).map(tag => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Prompt
        </button>
      </div>
    </div>
  );
}

export function Prompts() {
  const { prompts: promptsApi, data } = useData();
  const prompts = data.prompts;
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isEditing, setIsEditing] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('prompt_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [titleMaxWidth, setTitleMaxWidth] = useState(200);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all unique tags from all prompts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [prompts]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('prompt_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this prompt?')) {
      promptsApi.delete(id);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    promptsApi.update(id, { title: newTitle });
  };

  const handleEditTags = (id: string, tags: string[]) => {
    promptsApi.update(id, { tags });
  };

  const handleCreate = (data: { title: string; category: string; content: string; tags: string[] }) => {
    promptsApi.add(data);
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);
    
    const saveData = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      content: formData.get('content') as string,
      tags
    };

    if (isEditing) {
      promptsApi.update(isEditing.id, saveData);
    }

    setIsEditing(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Reorder logic would go here if needed
    }
  };

  const filteredPrompts = useMemo(() => {
    return prompts
      .filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                              p.content.toLowerCase().includes(search.toLowerCase()) ||
                              p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = filter === 'all' || p.category === filter;
        const matchesFavorites = !showFavoritesOnly || favorites.has(p.id);
        return matchesSearch && matchesCategory && matchesFavorites;
      })
      .sort((a, b) => {
        const aFav = favorites.has(a.id) ? 0 : 1;
        const bFav = favorites.has(b.id) ? 0 : 1;
        return aFav - bFav;
      });
  }, [prompts, search, filter, showFavoritesOnly, favorites]);

  const getPromptProps = (prompt: Prompt) => ({
    prompt,
    isFavorite: favorites.has(prompt.id),
    isCopied: copiedId === prompt.id,
    onCopy: () => handleCopy(prompt.content, prompt.id),
    onEdit: () => setIsEditing(prompt),
    onDelete: () => handleDelete(prompt.id),
    onToggleFavorite: () => toggleFavorite(prompt.id),
    onTagClick: (tag: string) => setSearch(tag),
    onRename: (newTitle: string) => handleRename(prompt.id, newTitle),
    onEditTags: (tags: string[]) => handleEditTags(prompt.id, tags),
    titleMaxWidth,
    allTags,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Prompts Library</h1>
          <p className="text-sm text-zinc-500">{prompts.length} prompts • {favorites.size} favorites</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Prompt
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search prompts by title, content, or tags..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select 
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {DEFAULT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            showFavoritesOnly 
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400" 
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          )}
        >
          <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-amber-400")} />
          Favorites
        </button>

        {/* Title Width Slider */}
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-zinc-500" />
          <input
            type="range"
            min={100}
            max={400}
            value={titleMaxWidth}
            onChange={(e) => setTitleMaxWidth(Number(e.target.value))}
            className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            title={`Title width: ${titleMaxWidth}px`}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === 'table' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
            title="Table view"
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === 'list' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
            title="Compact list"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === 'grid' ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
            title="Card grid"
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
            filter === 'all' 
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
          )}
        >
          All ({prompts.length})
        </button>
        {DEFAULT_CATEGORIES.map(cat => {
          const count = prompts.filter(p => p.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                filter === cat.value 
                  ? cat.color + " border" 
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* New Prompt Form */}
      {isCreating && (
        <NewPromptForm
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
          allTags={allTags}
        />
      )}

      {/* Prompts Display */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-10">
                  <Star className="h-3.5 w-3.5" />
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-28">
                  Category
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                  Preview
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                  Tags
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell w-24">
                  Updated
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPrompts.map((prompt) => (
                <PromptTableRow key={prompt.id} {...getPromptProps(prompt)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'list' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredPrompts.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredPrompts.map((prompt) => (
                <PromptCompactItem key={prompt.id} {...getPromptProps(prompt)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {viewMode === 'grid' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredPrompts.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrompts.map((prompt) => (
                <SortablePromptCard
                  key={prompt.id}
                  {...getPromptProps(prompt)}
                  viewMode="grid"
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {filteredPrompts.length === 0 && !isCreating && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Search className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">No prompts found</p>
          <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Edit Modal (only for content editing) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xl font-bold text-zinc-100">Edit Prompt Content</h2>
              <button onClick={() => setIsEditing(null)} className="text-zinc-400 hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Title</label>
                <input 
                  name="title" 
                  defaultValue={isEditing?.title}
                  required
                  placeholder="e.g., SQL Injection Detection"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Category</label>
                  <select 
                    name="category" 
                    defaultValue={isEditing?.category || 'other'}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tags (comma separated)</label>
                  <input 
                    name="tags" 
                    defaultValue={isEditing?.tags.join(', ')}
                    placeholder="llm, gpt, injection"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Prompt Content</label>
                <textarea 
                  name="content" 
                  defaultValue={isEditing?.content}
                  required
                  rows={10}
                  placeholder="Enter your prompt here..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  Update Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
