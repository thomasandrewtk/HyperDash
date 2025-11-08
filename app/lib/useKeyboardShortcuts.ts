'use client';

import { useEffect } from 'react';
import { useFocus } from '@/app/components/FocusContext';
import { getWidgetConfiguration, getNextFocusPosition } from './widgetConfig';

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
 * Focus shortcuts are disabled when mouse is active
 */
export function useKeyboardShortcuts() {
  const { focusedPosition, setFocusedPositionFromKeyboard } = useFocus();

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always allow Esc to work (for closing modals and defocusing text)
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('closeModals'));
        return;
      }

      // Ignore shortcuts if modifier keys are pressed (CMD/Ctrl/Alt)
      // Shift is allowed as it's used intentionally for some shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // Ignore shortcuts if user is editing text
      if (isEditingText()) {
        return;
      }

      // Handle focus navigation shortcuts
      // These always work - pressing a key gives keyboard control
      // Tab - Cycle forward through widgets
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const config = getWidgetConfiguration();
          const nextPosition = getNextFocusPosition(focusedPosition, config, 'forward');
          if (nextPosition !== null) {
            setFocusedPositionFromKeyboard(nextPosition);
          }
        } catch (error) {
          console.error('Error handling Tab key:', error);
        }
        return;
      }

      // Shift + Tab - Cycle backward through widgets
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const config = getWidgetConfiguration();
          const nextPosition = getNextFocusPosition(focusedPosition, config, 'backward');
          if (nextPosition !== null) {
            setFocusedPositionFromKeyboard(nextPosition);
          }
        } catch (error) {
          console.error('Error handling Shift+Tab key:', error);
        }
        return;
      }

      // Keys 1-9 - Direct focus to widget position
      const numKey = parseInt(e.key);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        try {
          const config = getWidgetConfiguration();
          const slot = config.find((s) => s.position === numKey);
          if (slot && slot.widgetType !== null) {
            e.preventDefault();
            e.stopPropagation();
            setFocusedPositionFromKeyboard(numKey);
          }
        } catch (error) {
          console.error('Error handling number key:', error);
        }
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

    // Use capture phase to catch Tab key before browser handles it
    // Try both window and document to ensure we catch the event
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [focusedPosition, setFocusedPositionFromKeyboard]);
}

