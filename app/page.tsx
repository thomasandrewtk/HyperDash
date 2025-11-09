'use client';

import { useState, useEffect } from 'react';
import Dashboard from "@/app/components/Dashboard";
import OnboardingScreen from "@/app/components/OnboardingScreen";
import { hasOnboardingCompleted } from "@/app/lib/utils";

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Check onboarding status on mount
    const completed = hasOnboardingCompleted();
    setShowOnboarding(!completed);
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Show nothing while checking (prevents flash)
  if (showOnboarding === null) {
    return null;
  }

  return (
    <main className="min-h-screen w-full">
      {showOnboarding ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : (
        <Dashboard />
      )}
    </main>
  );
}

