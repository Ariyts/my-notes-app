/**
 * Change Password Modal
 * 
 * Allows users to change their master password.
 * Requires current password verification and re-encrypts all data.
 */

import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, Loader2, Shield, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  decrypt,
  encrypt,
  loadEncryptedVault,
  saveEncryptedVault,
  generatePasswordHash,
  savePasswordHash,
  setSessionKey,
  deriveKey,
  base64ToUint8Array,
  checkPasswordStrength,
  markEncryptionSetUp,
} from '../../lib/crypto';

interface ChangePasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordModal({ onClose, onSuccess }: ChangePasswordModalProps) {
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [decryptedData, setDecryptedData] = useState<unknown>(null);
  
  const strength = checkPasswordStrength(newPassword);
  
  // Step 1: Verify current password
  const handleVerifyCurrent = async () => {
    if (!currentPassword.trim()) {
      setError('Please enter your current password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const vault = loadEncryptedVault();
      if (!vault) {
        setError('No encrypted vault found');
        setIsLoading(false);
        return;
      }
      
      // Try to decrypt
      const data = await decrypt(vault, currentPassword);
      setDecryptedData(data);
      setStep('new');
    } catch {
      setError('Incorrect password');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step 2: Validate new password
  const handleSetNewPassword = () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (strength.score < 2) {
      setError('Password is too weak');
      return;
    }
    
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }
    
    setError('');
    setStep('confirm');
  };
  
  // Step 3: Confirm and re-encrypt
  const handleConfirm = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!decryptedData) {
      setError('No data to encrypt. Please try again.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Re-encrypt with new password
      const newVault = await encrypt(decryptedData, newPassword);
      saveEncryptedVault(newVault);
      
      // Update password hash
      const { hash: pwdHash, salt: pwdSalt } = await generatePasswordHash(newPassword);
      savePasswordHash(pwdHash, pwdSalt);
      
      // Update session
      const encryptionSalt = base64ToUint8Array(newVault.salt);
      const key = await deriveKey(newPassword, encryptionSalt);
      setSessionKey(key, newPassword);
      
      // Clear sensitive data from memory
      setDecryptedData(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      onSuccess();
    } catch (err) {
      console.error('Failed to change password:', err);
      setError('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (step === 'current') handleVerifyCurrent();
      else if (step === 'new') handleSetNewPassword();
      else if (step === 'confirm') handleConfirm();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">Change Master Password</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-300 text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === 'current' && s === 1 ? "bg-emerald-600 text-white" :
                  step === 'new' && s <= 2 ? "bg-emerald-600 text-white" :
                  step === 'confirm' && s <= 3 ? "bg-emerald-600 text-white" :
                  s < (step === 'current' ? 1 : step === 'new' ? 2 : 3) ? "bg-emerald-600 text-white" :
                  "bg-zinc-700 text-zinc-400"
                )}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={cn(
                    "w-8 h-0.5",
                    s < (step === 'current' ? 1 : step === 'new' ? 2 : 3) ? "bg-emerald-600" : "bg-zinc-700"
                  )} />
                )}
              </div>
            ))}
          </div>
          
          {step === 'current' && (
            <>
              <p className="text-sm text-zinc-400">
                Enter your current password to continue.
              </p>
              
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Current password"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-3 px-4 pr-11 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </>
          )}
          
          {step === 'new' && (
            <>
              <p className="text-sm text-zinc-400">
                Enter your new password.
              </p>
              
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="New password"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-3 px-4 pr-11 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password strength */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Strength:</span>
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
                </div>
              )}
            </>
          )}
          
          {step === 'confirm' && (
            <>
              <p className="text-sm text-zinc-400">
                Confirm your new password.
              </p>
              
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-3 px-4 pr-11 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  All data will be re-encrypted with the new password
                </div>
              </div>
            </>
          )}
          
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            onClick={step === 'current' ? onClose : () => setStep(step === 'confirm' ? 'new' : 'current')}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
          >
            {step === 'current' ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={
              step === 'current' ? handleVerifyCurrent :
              step === 'new' ? handleSetNewPassword :
              handleConfirm
            }
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {step === 'current' ? 'Verify' : step === 'new' ? 'Continue' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
