export function getFromLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

export function saveToLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function removeFromLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

/**
 * Check if onboarding has been completed by checking for the onboardingCompleted flag
 * Returns true only if the user has explicitly completed onboarding by clicking Continue
 */
export function hasOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Only check for the explicit onboardingCompleted flag
    // This ensures onboarding only completes when user clicks Continue
    const completed = localStorage.getItem('onboardingCompleted');
    return completed === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

