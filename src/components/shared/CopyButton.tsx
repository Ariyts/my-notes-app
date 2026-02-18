/**
 * Shared Copy Button Component
 * 
 * A reusable copy-to-clipboard button with visual feedback.
 * Used across multiple content type views.
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CopyButtonProps {
  onCopy: () => void;
  isCopied: boolean;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function CopyButton({ 
  onCopy, 
  isCopied, 
  title = "Copy",
  className,
  size = 'md'
}: CopyButtonProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-3 py-1 text-xs';

  return (
    <button
      onClick={onCopy}
      className={cn(
        "flex items-center gap-1.5 rounded-full border font-medium transition-all",
        sizeClasses,
        isCopied
          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
          : "border-zinc-600 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400",
        className
      )}
    >
      {isCopied ? (
        <>
          <Check className={size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {isCopied && 'Copied!'}
        </>
      ) : (
        <>
          <Copy className={size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {title}
        </>
      )}
    </button>
  );
}

// Hook for copy functionality
export function useCopyButton(timeout = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), timeout);
  };

  return { copiedId, copyToClipboard };
}
