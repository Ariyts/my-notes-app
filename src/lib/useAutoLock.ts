/**
 * Auto-Lock Hook
 * 
 * Automatically locks the vault after a period of inactivity.
 * Resets timer on user activity (mouse, keyboard, touch, scroll).
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseAutoLockOptions {
  timeoutMs?: number;         // Timeout in milliseconds
  onLock: () => void;          // Callback when auto-lock triggers
  enabled?: boolean;           // Enable/disable auto-lock
  warningMs?: number;          // Show warning before lock (milliseconds)
  onWarning?: (remainingSeconds: number) => void;  // Warning callback
}

export function useAutoLock({
  timeoutMs = 15 * 60 * 1000,  // 15 minutes default
  onLock,
  enabled = true,
  warningMs = 60 * 1000,       // 1 minute warning
  onWarning,
}: UseAutoLockOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);
  
  // Lock the vault
  const lock = useCallback(() => {
    clearTimers();
    onLock();
  }, [onLock, clearTimers]);
  
  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    clearTimers();
    
    // Set warning timeout
    if (onWarning) {
      const warningDelay = timeoutMs - warningMs;
      if (warningDelay > 0) {
        warningTimeoutRef.current = setTimeout(() => {
          onWarning(Math.ceil(warningMs / 1000));
        }, warningDelay);
      }
    }
    
    // Set lock timeout
    timeoutRef.current = setTimeout(lock, timeoutMs);
  }, [enabled, timeoutMs, warningMs, lock, clearTimers, onWarning]);
  
  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }
    
    // Activity events to track
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ];
    
    // Reset timer on any activity
    const handleActivity = () => resetTimer();
    
    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Start initial timer
    resetTimer();
    
    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, resetTimer, clearTimers]);
  
  // Return lock function for manual lock
  return { lock, resetTimer };
}

/**
 * Time remaining hook for display
 */
export function useAutoLockTimeRemaining(
  timeoutMs: number = 15 * 60 * 1000,
  enabled: boolean = true
) {
  const [remaining, setRemaining] = useState<number>(timeoutMs);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!enabled) {
      setRemaining(timeoutMs);
      return;
    }
    
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'];
    
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = Math.max(0, timeoutMs - elapsed);
      setRemaining(remainingMs);
    }, 1000);
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeoutMs, enabled]);
  
  return remaining;
}

// Import useState for the time remaining hook
import { useState } from 'react';
