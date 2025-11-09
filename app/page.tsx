'use client';

import { useState, useEffect } from 'react';
import Dashboard from "@/app/components/Dashboard";
import OnboardingScreen from "@/app/components/OnboardingScreen";
import KeyboardShortcutsScreen from "@/app/components/KeyboardShortcutsScreen";
import { hasOnboardingCompleted, getFromLocalStorage } from "@/app/lib/utils";

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    // Check onboarding status on mount
    const completed = hasOnboardingCompleted();
    setShowOnboarding(!completed);
    
    // Check if we should show shortcuts screen after onboarding
    if (completed) {
      const shortcutsShown = getFromLocalStorage('keyboardShortcutsShown');
      if (!shortcutsShown) {
        // Show shortcuts screen on first load after onboarding
        setShowShortcuts(true);
      }
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Show keyboard shortcuts screen after onboarding
    setShowShortcuts(true);
  };

  const handleShortcutsClose = () => {
    setShowShortcuts(false);
    // Mark shortcuts as shown
    if (typeof window !== 'undefined') {
      localStorage.setItem('keyboardShortcutsShown', 'true');
    }
  };

  // Show nothing while checking (prevents flash)
  if (showOnboarding === null) {
    return null;
  }

  return (
    <main className="min-h-screen w-full">
      {showOnboarding ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : showShortcuts ? (
        <KeyboardShortcutsScreen onClose={handleShortcutsClose} fromOnboarding={true} />
      ) : (
        <Dashboard />
      )}
    </main>
  );
}

