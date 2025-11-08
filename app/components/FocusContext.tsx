'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

interface FocusContextType {
  focusedPosition: number | null;
  isMouseActive: boolean;
  keyboardControl: boolean; // True when keyboard has been used recently
  setFocusedPositionFromKeyboard: (position: number | null) => void;
  setFocusedPositionFromMouse: (position: number | null) => void;
  setMouseActive: (active: boolean) => void;
  setKeyboardControl: (control: boolean) => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [focusedPosition, setFocusedPosition] = useState<number | null>(null);
  const [isMouseActive, setIsMouseActive] = useState<boolean>(false);
  const [keyboardControl, setKeyboardControl] = useState<boolean>(false);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced function to set mouse inactive after stillness
  const handleMouseStillness = useCallback(() => {
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }
    
    mouseTimeoutRef.current = setTimeout(() => {
      setIsMouseActive(false);
    }, 500);
  }, []);

  // Global mouse movement detection
  useEffect(() => {
    const handleMouseMove = () => {
      setIsMouseActive(true);
      handleMouseStillness();
      // Mouse movement disables keyboard control
      if (keyboardControl) {
        setKeyboardControl(false);
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
    };
  }, [handleMouseStillness, keyboardControl]);

  // Wrapper function to set mouse active state
  // When setting to false, clear any pending timeout
  const setMouseActive = useCallback((active: boolean) => {
    if (active) {
      setIsMouseActive(true);
      handleMouseStillness();
    } else {
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
      setIsMouseActive(false);
    }
  }, [handleMouseStillness]);

  // Wrapper function to set keyboard control
  // When keyboard is used, enable keyboard control for 2 seconds
  const setKeyboardControlWithTimeout = useCallback((control: boolean) => {
    setKeyboardControl(control);
    if (control) {
      // Clear any existing timeout
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
      // Disable keyboard control after 2 seconds of no keyboard input
      keyboardTimeoutRef.current = setTimeout(() => {
        setKeyboardControl(false);
      }, 2000);
    } else {
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
    }
  }, []);

  // Set focus from keyboard - always works and enables keyboard control
  const setFocusedPositionFromKeyboard = useCallback((position: number | null) => {
    setFocusedPosition(position);
    setMouseActive(false);
    setKeyboardControlWithTimeout(true);
  }, [setKeyboardControlWithTimeout]);

  // Set focus from mouse - only works if keyboard doesn't have control
  const setFocusedPositionFromMouse = useCallback((position: number | null) => {
    // Only allow mouse to change focus if keyboard doesn't have control
    if (!keyboardControl) {
      setFocusedPosition(position);
      setKeyboardControlWithTimeout(false);
    }
  }, [keyboardControl, setKeyboardControlWithTimeout]);

  return (
    <FocusContext.Provider
      value={{
        focusedPosition,
        isMouseActive,
        keyboardControl,
        setFocusedPositionFromKeyboard,
        setFocusedPositionFromMouse,
        setMouseActive,
        setKeyboardControl: setKeyboardControlWithTimeout,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}

