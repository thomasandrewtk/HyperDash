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
 * Type for widget keyboard shortcuts configuration
 * Maps key strings to handler functions
 */
export type WidgetShortcuts = Record<string, (e: KeyboardEvent) => void>;

/**
 * Custom hook that manages widget-specific keyboard shortcuts
 * Shortcuts only activate when the widget is focused
 * Shortcuts are disabled when user is editing text
 * 
 * @param isFocused - Whether the widget is currently focused
 * @param shortcuts - Object mapping key strings to handler functions
 */
export function useWidgetKeyboardShortcuts(
  isFocused: boolean,
  shortcuts: WidgetShortcuts
) {
  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;
    
    // Don't attach listeners if widget is not focused
    if (!isFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if modifier keys are pressed (CMD/Ctrl/Alt)
      // Shift is allowed as it's used intentionally for some shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // Ignore shortcuts if user is editing text
      if (isEditingText()) {
        return;
      }

      // Check if this key has a handler
      const handler = shortcuts[e.key];
      if (handler) {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      }
    };

    // Use capture phase to catch keys before browser handles them
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isFocused, shortcuts]);
}

