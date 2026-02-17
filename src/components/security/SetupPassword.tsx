/**
 * Setup Password Wizard
 * 
 * First-time password setup with:
 * - Password strength indicator
 * - Confirmation field
 * - Clear warnings about data loss
 */

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  encrypt,
  saveEncryptedVault,
  markEncryptionSetUp,
  generatePasswordHash,
  savePasswordHash,
  setSessionKey,
  deriveKey,
  uint8ArrayToBase64,
  checkPasswordStrength,
  generatePassword,
} from '../../lib/crypto';

interface SetupPasswordProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function SetupPassword({ onComplete, onSkip }: SetupPasswordProps) {
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [useGenerated, setUseGenerated] = useState(false);
  
  const strength = checkPasswordStrength(useGenerated ? generatedPassword : password);
  
  // Generate random password
  const handleGeneratePassword = () => {
    const generated = generatePassword(24);
    setGeneratedPassword(generated);
    setUseGenerated(true);
    setPassword(generated);
  };
  
  // Validate and proceed to confirmation
  const handleContinue = () => {
    const pwd = useGenerated ? generatedPassword : password;
    
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (strength.score < 2) {
      setError('Password is too weak. Use a stronger password.');
      return;
    }
    
    if (!agreed) {
      setError('You must agree to the terms');
      return;
    }
    
    setError('');
    setStep('confirm');
  };
  
  // Final setup
  const handleSetup = async () => {
    const pwd = useGenerated ? generatedPassword : password;
    
    if (pwd !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Get current data to encrypt
      const workspaces = JSON.parse(localStorage.getItem('pentest-hub-workspaces') || '[]');
      const sections = JSON.parse(localStorage.getItem('pentest-hub-sections') || '[]');
      
      // Gather all section data
      const items: Record<string, unknown[]> = {};
      sections.forEach((s: { id: string }) => {
        items[s.id] = JSON.parse(localStorage.getItem(`section-data-${s.id}`) || '[]');
      });
      
      const allData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workspaces,
        sections,
        items,
      };
      
      // Encrypt the data
      const encrypted = await encrypt(allData, pwd);
      
      // Save encrypted vault
      saveEncryptedVault(encrypted);
      
      // Save password hash for quick verification
      const hash = await generatePasswordHash(pwd);
      savePasswordHash(hash);
      
      // Derive key for session
      const salt = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));
      const key = await deriveKey(pwd, salt);
      setSessionKey(key, pwd);
      
      // Mark setup complete
      markEncryptionSetUp();
      
      // Done!
      onComplete();
      
    } catch (err) {
      console.error('Failed to setup encryption:', err);
      setError('Failed to setup encryption. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'setup') {
        handleContinue();
      } else {
        handleSetup();
      }
    }
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-auto py-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Setup card */}
      <div className="relative w-full max-w-lg mx-4">
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-zinc-700/50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">
              🔐 Setup Master Password
            </h1>
            <p className="text-sm text-zinc-400">
              Create a strong master password to encrypt your data
            </p>
          </div>
          
          {/* Content */}
          <div className="p-8 space-y-6">
            {step === 'setup' ? (
              <>
                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={useGenerated ? generatedPassword : password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setUseGenerated(false);
                        setError('');
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter a strong password"
                      className={cn(
                        "w-full rounded-lg bg-zinc-900/50 border py-3 px-4 pr-11 text-zinc-100 placeholder-zinc-500",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-500",
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
                </div>
                
                {/* Generate password option */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate random password
                  </button>
                </div>
                
                {/* Password strength */}
                {(password || generatedPassword) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Password Strength:</span>
                      <span style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${(strength.score / 4) * 100}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </div>
                    {strength.feedback.length > 0 && (
                      <div className="text-xs text-zinc-500 space-y-1">
                        {strength.feedback.map((f, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <X className="h-3 w-3 text-red-400" />
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Warning */}
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-medium">
                    <AlertTriangle className="h-5 w-5" />
                    WARNING
                  </div>
                  <ul className="text-sm text-amber-300/80 space-y-1 pl-7">
                    <li>This password <strong>CANNOT be recovered</strong></li>
                    <li>If you forget it, <strong>ALL DATA IS LOST</strong></li>
                    <li>Write it down and store in a safe place</li>
                  </ul>
                </div>
                
                {/* Agreement checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-300">
                    I understand that forgetting my password means losing access to all my data
                  </span>
                </label>
                
                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                {/* Buttons */}
                <div className="flex gap-3">
                  {onSkip && (
                    <button
                      onClick={onSkip}
                      className="flex-1 rounded-lg py-3 text-zinc-400 hover:text-zinc-200 text-sm"
                    >
                      Skip for now
                    </button>
                  )}
                  <button
                    onClick={handleContinue}
                    disabled={!password && !generatedPassword}
                    className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Confirmation step */}
                <div className="text-center mb-6">
                  <p className="text-zinc-300">Please confirm your password</p>
                  {useGenerated && (
                    <div className="mt-2 p-3 bg-emerald-500/10 rounded-lg">
                      <p className="text-xs text-emerald-400">Your generated password:</p>
                      <p className="font-mono text-sm text-emerald-300 break-all mt-1">
                        {generatedPassword}
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        ⚠️ Copy this password now! It won't be shown again.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Confirm password field */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Re-enter your password"
                      className={cn(
                        "w-full rounded-lg bg-zinc-900/50 border py-3 px-4 pr-11 text-zinc-100 placeholder-zinc-500",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-500",
                        error ? "border-red-500/50" : "border-zinc-700"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('setup')}
                    className="flex-1 rounded-lg py-3 text-zinc-400 hover:text-zinc-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSetup}
                    disabled={isLoading || !confirmPassword}
                    className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        Create Password
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
