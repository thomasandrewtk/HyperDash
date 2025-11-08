'use client';

import { useEffect } from 'react';

/**
 * Checks if the user is currently editing text in an input, textarea, or contenteditable element
 */
function isEditingText(): boolean {
  if (typeof document === 'undefined') return false;
  
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  // Check if it's an input element (any type)
  if (activeElement instanceof HTMLInputElement) {
    return true;
  }

  // Check if it's a textarea element
  if (activeElement instanceof HTMLTextAreaElement) {
    return true;
  }

  // Check if it's a contenteditable element
  if (
    activeElement instanceof HTMLElement &&
    activeElement.contentEditable === 'true'
  ) {
    return true;
  }

  return false;
}

/**
 * Custom hook that manages global keyboard shortcuts
 * Shortcuts are disabled when user is editing text (except Esc)
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always allow Esc to work (for closing modals and defocusing text)
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('closeModals'));
        return;
      }

      // Ignore shortcuts if user is editing text
      if (isEditingText()) {
        return;
      }

      // Handle shortcuts based on key and modifiers
      if (e.shiftKey) {
        // Shift + W - Wallpaper Upload
        if (e.key === 'W' || e.key === 'w') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('openWallpaperUpload'));
          return;
        }

        // Shift + C - Toggle Clock Format
        if (e.key === 'C' || e.key === 'c') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggleClockFormat'));
          return;
        }

        // Shift + E - Export Data
        if (e.key === 'E' || e.key === 'e') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('exportData'));
          return;
        }

        // Shift + I - Import Data
        if (e.key === 'I' || e.key === 'i') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('importData'));
          return;
        }
      } else {
        // S - Open Settings Modal
        if (e.key === 'S' || e.key === 's') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('openSettings'));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

