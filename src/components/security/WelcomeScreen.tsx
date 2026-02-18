/**
 * Welcome Screen
 * 
 * First screen shown to new users or on new devices.
 * Allows choosing between:
 * - Create new vault (setup encryption)
 * - Restore from GitHub (pull existing data)
 */

import { useState } from 'react';
import { Shield, Cloud, ArrowRight, Lock, Github } from 'lucide-react';
import { cn } from '../../utils/cn';
import { RestoreFromGitHub } from './RestoreFromGitHub';
import { SetupPassword } from './SetupPassword';

interface WelcomeScreenProps {
  onComplete: () => void;
}

type WelcomeStep = 'welcome' | 'new-user' | 'restore' | 'restore-with-token';

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState<WelcomeStep>('welcome');
  const [detectedRepo, setDetectedRepo] = useState<{ owner: string; repo: string } | null>(null);

  // Detect if we're on GitHub Pages
  const isGitHubPages = window.location.hostname.endsWith('.github.io');

  const handleNewUser = () => {
    setStep('new-user');
  };

  const handleRestore = () => {
    setStep('restore');
  };

  const handleSetupComplete = () => {
    onComplete();
  };

  const handleRestoreComplete = () => {
    onComplete();
  };

  const handleBack = () => {
    setStep('welcome');
  };

  // Step 1: Welcome / Choice
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Shield className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Pentest Hub</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Encrypted knowledge base for security professionals
            </p>
          </div>

          {/* Choice Cards */}
          <div className="space-y-3">
            {/* New User */}
            <button
              onClick={handleNewUser}
              className={cn(
                "w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",
                "hover:border-emerald-500/50 hover:bg-zinc-900",
                "transition-all duration-200 group"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Lock className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-zinc-100">New User</span>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">Recommended</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    Create a new encrypted vault with a master password
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 transition-colors mt-3" />
              </div>
            </button>

            {/* Restore from GitHub */}
            <button
              onClick={handleRestore}
              className={cn(
                "w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",
                "hover:border-blue-500/50 hover:bg-zinc-900",
                "transition-all duration-200 group"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Github className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-zinc-100">Restore from GitHub</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    I have existing encrypted data in my repository
                  </p>
                  {isGitHubPages && (
                    <p className="mt-1 text-xs text-blue-400">
                      <Cloud className="inline h-3 w-3 mr-1" />
                      GitHub Pages detected
                    </p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-blue-400 transition-colors mt-3" />
              </div>
            </button>
          </div>

          {/* Skip option */}
          <div className="text-center">
            <button
              onClick={onComplete}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip setup (no encryption)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: New User Setup
  if (step === 'new-user') {
    return (
      <SetupPassword
        onComplete={handleSetupComplete}
        onSkip={handleBack}
      />
    );
  }

  // Step 3: Restore from GitHub
  if (step === 'restore') {
    return (
      <RestoreFromGitHub
        onComplete={handleRestoreComplete}
        onBack={handleBack}
      />
    );
  }

  return null;
}
