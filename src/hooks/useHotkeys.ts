import { useEffect, useCallback } from 'react';

type HotkeyCallback = (e: KeyboardEvent) => void;

interface Hotkey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: HotkeyCallback;
}

export function useHotkeys(hotkeys: Hotkey[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const hotkey of hotkeys) {
      const ctrlMatch = hotkey.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = hotkey.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = hotkey.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === hotkey.key.toLowerCase();
      
      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        hotkey.callback(e);
        return;
      }
    }
  }, [hotkeys]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalSearch(setOpen: (open: boolean) => void) {
  useHotkeys([
    { key: 'k', ctrl: true, callback: () => setOpen(true) },
    { key: 'Escape', callback: () => setOpen(false) },
  ]);
}
