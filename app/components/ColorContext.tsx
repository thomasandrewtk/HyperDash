'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ColorPalette, getDefaultPalette, analyzeWallpaperBrightness, calculateReactiveColors } from '@/app/lib/colorUtils';
import { getFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from '@/app/lib/utils';

interface ColorContextType {
  colors: ColorPalette;
  updateColorsFromWallpaper: (imageSrc: string) => Promise<void>;
  resetToDefault: () => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function ColorProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ColorPalette>(getDefaultPalette());

  const updateColorsFromWallpaper = useCallback(async (imageSrc: string) => {
    try {
      const brightness = await analyzeWallpaperBrightness(imageSrc);
      const newColors = calculateReactiveColors(brightness);
      setColors(newColors);
      
      // Save to localStorage for persistence
      saveToLocalStorage('reactiveColors', JSON.stringify(newColors));
    } catch (error) {
      console.error('Error analyzing wallpaper:', error);
      // Fallback to default on error
      setColors(getDefaultPalette());
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setColors(getDefaultPalette());
    removeFromLocalStorage('reactiveColors');
  }, []);

  // Load saved colors from localStorage on mount, then analyze wallpaper if available
  useEffect(() => {
    const savedColors = getFromLocalStorage('reactiveColors');
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        setColors(parsed);
      } catch (error) {
        console.error('Error parsing saved colors:', error);
      }
    }
    
    // After loading saved colors, check if wallpaper needs analysis
    const savedWallpaper = getFromLocalStorage('wallpaper');
    if (savedWallpaper) {
      updateColorsFromWallpaper(savedWallpaper).catch(console.error);
    }
  }, [updateColorsFromWallpaper]);

  // Listen for wallpaper changes
  useEffect(() => {
    const handleWallpaperChange = async (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      const imageSrc = customEvent.detail;
      if (imageSrc) {
        await updateColorsFromWallpaper(imageSrc);
      } else {
        // Reset to default when wallpaper is removed
        resetToDefault();
      }
    };

    window.addEventListener('wallpaperChanged', handleWallpaperChange);

    return () => {
      window.removeEventListener('wallpaperChanged', handleWallpaperChange);
    };
  }, [updateColorsFromWallpaper, resetToDefault]);

  // Set CSS custom properties for dynamic styling (especially placeholders)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--text-primary', colors.primary);
      root.style.setProperty('--text-secondary', colors.secondary);
      root.style.setProperty('--text-placeholder', colors.placeholder);
      root.style.setProperty('--text-muted', colors.muted);
      root.style.setProperty('--text-button', colors.button);
    }
  }, [colors]);

  return (
    <ColorContext.Provider value={{ colors, updateColorsFromWallpaper, resetToDefault }}>
      {children}
    </ColorContext.Provider>
  );
}

export function useReactiveColors() {
  const context = useContext(ColorContext);
  if (context === undefined) {
    throw new Error('useReactiveColors must be used within a ColorProvider');
  }
  return context;
}

