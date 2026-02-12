import { useState, useEffect } from 'react';
import { History, RotateCcw, Clock, X, ChevronRight } from 'lucide-react';
import { storageEnhanced, HistoryEntry } from '../lib/storage-enhanced';
import { cn } from '../utils/cn';
import { formatDistanceToNow } from 'date-fns';

interface HistoryPanelProps {
  itemId: string;
  itemType?: 'note' | 'prompt';
  isOpen: boolean;
  onClose: () => void;
  onRestore: (content: string, title: string) => void;
}

export function HistoryPanel({ itemId, itemType: _itemType, isOpen, onClose, onRestore }: HistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      setEntries(storageEnhanced.history.getForItem(itemId));
      setSelectedEntry(null);
    }
  }, [isOpen, itemId]);

  const handleRestore = () => {
    if (selectedEntry) {
      onRestore(selectedEntry.content, selectedEntry.title);
      setShowConfirm(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[80vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-zinc-400" />
            <h2 className="text-xl font-bold text-zinc-100">Version History</h2>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {entries.length} versions
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Versions List */}
          <div className="w-72 border-r border-zinc-800 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">
                <History className="mx-auto mb-2 h-8 w-8" />
                <p>No version history</p>
                <p className="text-xs mt-1">Versions are saved when you edit and save</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors",
                      selectedEntry?.id === entry.id
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 truncate">
                      {entry.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 line-clamp-2">
                      {entry.content.slice(0, 100)}...
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEntry ? (
              <>
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div>
                    <h3 className="font-medium text-zinc-100">{selectedEntry.title}</h3>
                    <p className="text-xs text-zinc-500">
                      {new Date(selectedEntry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {showConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-400">Restore this version?</span>
                      <button
                        onClick={handleRestore}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
                      >
                        Yes, Restore
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
                    {selectedEntry.content}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <div className="text-center">
                  <History className="mx-auto mb-2 h-12 w-12 text-zinc-700" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
