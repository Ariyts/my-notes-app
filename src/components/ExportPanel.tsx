import { useState } from 'react';
import { FileText, FileDown, FileJson, Loader2, Check, X } from 'lucide-react';
import { storageEnhanced } from '../lib/storage-enhanced';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'json' | 'markdown' | 'pdf';

export function ExportPanel({ isOpen, onClose }: ExportPanelProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exported, setExported] = useState<ExportFormat | null>(null);

  const exportJSON = () => {
    setExporting('json');
    const data = storageEnhanced.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pentest-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    setExported('json');
    setTimeout(() => setExported(null), 2000);
  };

  const exportMarkdown = () => {
    setExporting('markdown');
    const markdown = storageEnhanced.exportToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pentest-hub-notes-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    setExported('markdown');
    setTimeout(() => setExported(null), 2000);
  };

  const exportPDF = async () => {
    setExporting('pdf');
    
    try {
      // Dynamic import to reduce bundle size
      const { jsPDF } = await import('jspdf');
      
      const notes = storageEnhanced.notes.getAll();
      const prompts = storageEnhanced.prompts.getAll();
      
      const doc = new jsPDF();
      let yPos = 20;
      const pageHeight = 280;
      const margin = 20;
      const lineHeight = 7;
      
      // Title
      doc.setFontSize(24);
      doc.setTextColor(16, 185, 129); // Emerald color
      doc.text('Pentest Hub Export', margin, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exported on ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 20;
      
      // Notes Section
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text('Notes', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      notes.forEach(note => {
        // Check if we need a new page
        if (yPos > pageHeight) {
          doc.addPage();
          yPos = 20;
        }
        
        // Note title
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`• ${note.title}`, margin, yPos);
        yPos += lineHeight;
        
        // Category
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`  Category: ${note.category}`, margin, yPos);
        yPos += lineHeight;
        
        // Content preview (first 200 chars)
        const contentPreview = note.content.replace(/[#*`]/g, '').slice(0, 200) + '...';
        const lines = doc.splitTextToSize(contentPreview, 170);
        lines.forEach((line: string) => {
          if (yPos > pageHeight) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`  ${line}`, margin, yPos);
          yPos += 5;
        });
        
        yPos += 5;
      });
      
      // Prompts Section
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;
      
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text('Prompts', margin, yPos);
      yPos += 10;
      
      prompts.forEach(prompt => {
        if (yPos > pageHeight) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`• ${prompt.title}`, margin, yPos);
        yPos += lineHeight;
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`  Category: ${prompt.category}`, margin, yPos);
        yPos += lineHeight * 2;
      });
      
      // Save
      doc.save(`pentest-hub-export-${new Date().toISOString().split('T')[0]}.pdf`);
      
      setExporting(null);
      setExported('pdf');
      setTimeout(() => setExported(null), 2000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setExporting(null);
    }
  };

  if (!isOpen) return null;

  const options = [
    {
      format: 'json' as ExportFormat,
      icon: FileJson,
      title: 'JSON Backup',
      description: 'Complete backup including all data. Can be imported back.',
      action: exportJSON,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      format: 'markdown' as ExportFormat,
      icon: FileText,
      title: 'Markdown Export',
      description: 'Export all notes as a single Markdown file.',
      action: exportMarkdown,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      format: 'pdf' as ExportFormat,
      icon: FileDown,
      title: 'PDF Export',
      description: 'Export notes and prompts as a printable PDF.',
      action: exportPDF,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-xl font-bold text-zinc-100">Export Data</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {options.map((opt) => (
            <button
              key={opt.format}
              onClick={opt.action}
              disabled={exporting !== null}
              className="w-full flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${opt.bg}`}>
                {exporting === opt.format ? (
                  <Loader2 className={`h-6 w-6 ${opt.color} animate-spin`} />
                ) : exported === opt.format ? (
                  <Check className={`h-6 w-6 ${opt.color}`} />
                ) : (
                  <opt.icon className={`h-6 w-6 ${opt.color}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-zinc-100">{opt.title}</div>
                <div className="text-sm text-zinc-500">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-800 px-6 py-3">
          <p className="text-center text-xs text-zinc-600">
            All exports are generated locally. No data leaves your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
