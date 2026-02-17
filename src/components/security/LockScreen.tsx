/**
 * Lock Screen Component
 * 
 * Password entry screen with:
 * - Rate limiting (5 attempts → 30s lockout)
 * - Password visibility toggle
 * - Secure unlock flow
 */

import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  decrypt,
  loadEncryptedVault,
  setSessionKey,
  generatePasswordHash,
  savePasswordHash,
  base64ToUint8Array,
  deriveKey,
} from '../../lib/crypto';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Rate limiting constants
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SECONDS = 30;
  
  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      setCountdown(remaining);
      
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setError('');
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lockedUntil]);
  
  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleUnlock = async () => {
    if (lockedUntil && new Date() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${remaining}s`);
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Get encrypted vault
      const encryptedData = loadEncryptedVault();
      
      if (!encryptedData) {
        setError('No encrypted data found. Please setup encryption first.');
        setIsLoading(false);
        return;
      }
      
      // Try to decrypt
      try {
        await decrypt(encryptedData, password);
        
        // Success! Derive key for session
        const encryptionSalt = base64ToUint8Array(encryptedData.salt);
        const key = await deriveKey(password, encryptionSalt);
        setSessionKey(key, password);
        
        // Save password hash for quick verification
        const { hash: pwdHash, salt: pwdSalt } = await generatePasswordHash(password);
        savePasswordHash(pwdHash, pwdSalt);
        
        // Reset attempts
        setAttempts(0);
        setError('');
        
        // Unlock
        onUnlock();
        
      } catch (decryptError) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + LOCKOUT_SECONDS * 1000);
          setLockedUntil(lockUntil);
          setCountdown(LOCKOUT_SECONDS);
          setError(`Too many failed attempts. Locked for ${LOCKOUT_SECONDS} seconds.`);
        } else {
          setError(`Invalid password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      setError('Failed to unlock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !lockedUntil) {
      handleUnlock();
    }
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Lock card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">
              Pentest Hub
            </h1>
            <p className="text-sm text-zinc-400">
              Enter your master password to unlock
            </p>
          </div>
          
          {/* Form */}
          <div className="px-8 pb-8 space-y-4">
            {/* Password input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="h-5 w-5" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Master password"
                disabled={isLoading || !!(lockedUntil && new Date() < lockedUntil)}
                autoFocus
                className={cn(
                  "w-full rounded-xl bg-zinc-900/50 border py-3 pl-11 pr-11 text-zinc-100 placeholder-zinc-500",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500/50" : "border-zinc-700"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Error message */}
            {error && (
              <div className={cn(
                "flex items-center gap-2 rounded-lg p-3 text-sm",
                countdown > 0 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
              )}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {/* Unlock button */}
            <button
              onClick={handleUnlock}
              disabled={isLoading || !password.trim() || !!(lockedUntil && new Date() < lockedUntil)}
              className={cn(
                "w-full rounded-xl py-3 font-medium text-white",
                "bg-gradient-to-r from-emerald-600 to-emerald-500",
                "hover:from-emerald-500 hover:to-emerald-400",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Unlocking...
                </>
              ) : lockedUntil && new Date() < lockedUntil ? (
                `Locked (${countdown}s)`
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Unlock
                </>
              )}
            </button>
            
            {/* Info */}
            <p className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1">
              <span>ⓘ</span>
              Password is never stored or transmitted
            </p>
          </div>
          
          {/* Attempts indicator */}
          {attempts > 0 && !lockedUntil && (
            <div className="px-8 pb-4">
              <div className="flex gap-1 justify-center">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i < attempts ? "bg-red-500" : "bg-zinc-700"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Forgot password? Your data cannot be recovered.
        </p>
      </div>
    </div>
  );
}
