import { useState } from 'react';
import { Download, Upload, AlertCircle, Check } from 'lucide-react';
import { storage } from '../lib/storage';

interface ExportImportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportImport({ isOpen, onClose }: ExportImportProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleExport = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: storage.prompts.getAll(),
      notes: storage.notes.getAll(),
      snippets: storage.snippets.getAll(),
      resources: JSON.parse(localStorage.getItem('pentest_resources') || '[]'),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pentest-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus('success');
    setMessage('Backup exported successfully!');
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Validate structure
        if (!data.prompts || !data.notes || !data.snippets) {
          throw new Error('Invalid backup file structure');
        }

        // Confirm before overwriting
        if (!confirm('This will REPLACE all your current data. Are you sure?')) {
          return;
        }

        // Import data
        localStorage.setItem('pentest_prompts', JSON.stringify(data.prompts));
        localStorage.setItem('pentest_notes', JSON.stringify(data.notes));
        localStorage.setItem('pentest_snippets', JSON.stringify(data.snippets));
        localStorage.setItem('pentest_resources', JSON.stringify(data.resources || []));

        setStatus('success');
        setMessage('Backup imported! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setStatus('error');
        setMessage('Failed to import: Invalid file format');
        setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-zinc-100">Backup & Restore</h2>
        
        {status !== 'idle' && (
          <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${
            status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-sm">{message}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
              <Download className="h-4 w-4 text-emerald-400" />
              Export Data
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Download all your prompts, notes, snippets, and resources as JSON.
            </p>
            <button
              onClick={handleExport}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              Download Backup
            </button>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
              <Upload className="h-4 w-4 text-blue-400" />
              Import Data
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Restore from a previously exported backup file.
            </p>
            <label className="mt-3 inline-block cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
              Choose File
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
