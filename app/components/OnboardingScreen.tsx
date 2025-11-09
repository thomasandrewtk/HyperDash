'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Widget from './Widget';
import { ColorProvider, useReactiveColors } from './ColorContext';
import { WALLPAPER_PRESETS } from '@/app/lib/wallpaperConfig';
import { saveToLocalStorage } from '@/app/lib/utils';

interface OnboardingScreenProps {
  onComplete: () => void;
}

function OnboardingContent({ onComplete }: OnboardingScreenProps) {
  const { colors } = useReactiveColors();
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [previousWallpaper, setPreviousWallpaper] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [widgetMounted, setWidgetMounted] = useState(false);
  const [selectedWallpaperIndex, setSelectedWallpaperIndex] = useState<number | null>(null);
  const wallpaperGridRef = useRef<HTMLDivElement>(null);

  // Widget entrance animation
  useEffect(() => {
    setWidgetMounted(true);
  }, []);

  // Handle wallpaper selection
  const handleWallpaperSelect = useCallback((wallpaperUrl: string, index?: number) => {
    // Store previous wallpaper for crossfade
    if (selectedWallpaper && selectedWallpaper !== wallpaperUrl) {
      setPreviousWallpaper(selectedWallpaper);
    }
    setSelectedWallpaper(wallpaperUrl);
    if (index !== undefined) {
      setSelectedWallpaperIndex(index);
    }
    // Update background with fade transition
    saveToLocalStorage('wallpaper', wallpaperUrl);
    // Trigger wallpaper change event for ColorContext
    window.dispatchEvent(new CustomEvent('wallpaperChanged', { detail: wallpaperUrl }));
  }, [selectedWallpaper]);

  // Start crossfade when new wallpaper is set and previous exists
  useEffect(() => {
    if (selectedWallpaper && previousWallpaper && previousWallpaper !== selectedWallpaper) {
      // Small delay to ensure new image starts rendering
      const timer = setTimeout(() => {
        setIsCrossfading(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedWallpaper, previousWallpaper]);

  // Handle crossfade completion
  useEffect(() => {
    if (isCrossfading && previousWallpaper) {
      const timer = setTimeout(() => {
        setPreviousWallpaper(null);
        setIsCrossfading(false);
      }, 500); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isCrossfading, previousWallpaper]);

  // Handle continue button
  const handleContinue = useCallback(() => {
    if (!selectedWallpaper) return;
    
    setIsTransitioning(true);
    // Mark onboarding as complete
    saveToLocalStorage('onboardingCompleted', 'true');
    
    // Small delay for transition animation
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [selectedWallpaper, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedWallpaperIndex === null) {
        // If nothing selected, allow navigation
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedWallpaperIndex(0);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedWallpaperIndex(WALLPAPER_PRESETS.length - 1);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedWallpaperIndex((prev) => 
          prev !== null ? (prev + 1) % WALLPAPER_PRESETS.length : 0
        );
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedWallpaperIndex((prev) => 
          prev !== null ? (prev - 1 + WALLPAPER_PRESETS.length) % WALLPAPER_PRESETS.length : 0
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = selectedWallpaperIndex !== null 
          ? Math.min(selectedWallpaperIndex + 3, WALLPAPER_PRESETS.length - 1)
          : 0;
        setSelectedWallpaperIndex(nextIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = selectedWallpaperIndex !== null 
          ? Math.max(selectedWallpaperIndex - 3, 0)
          : 0;
        setSelectedWallpaperIndex(prevIndex);
      } else if (e.key === 'Enter' && selectedWallpaper) {
        e.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWallpaperIndex, selectedWallpaper, handleContinue]);

  // Update selected wallpaper when index changes
  useEffect(() => {
    if (selectedWallpaperIndex !== null) {
      const preset = WALLPAPER_PRESETS[selectedWallpaperIndex];
      if (preset) {
        handleWallpaperSelect(preset.url);
      }
    }
  }, [selectedWallpaperIndex, handleWallpaperSelect]);

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Background images with crossfade transition */}
      <div className="fixed inset-0 z-0 bg-black">
        {/* Previous wallpaper - fading out */}
        {previousWallpaper && (
          <img
            key={`prev-${previousWallpaper}`}
            src={previousWallpaper}
            alt="Previous wallpaper"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ width: '100vw', height: '100vh', opacity: isCrossfading ? 0 : 1 }}
          />
        )}
        {/* Current wallpaper - fading in */}
        {selectedWallpaper && (
          <img
            key={`current-${selectedWallpaper}`}
            src={selectedWallpaper}
            alt="Wallpaper background"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ 
              width: '100vw', 
              height: '100vh', 
              opacity: previousWallpaper && previousWallpaper !== selectedWallpaper ? (isCrossfading ? 1 : 0) : 1
            }}
          />
        )}
      </div>

      {/* Content with centered widget */}
      <div className="relative z-10 h-screen flex items-center justify-center p-4">
        <div 
          className={`w-full max-w-2xl transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          } ${widgetMounted ? 'animate-widget-entrance' : 'opacity-0 translate-y-4'}`}
        >
          <Widget className="max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col items-center gap-8">
              {/* Static text */}
              <div className="text-center">
                <h1 
                  className="text-3xl md:text-4xl font-semibold mb-2"
                  style={{ color: colors.secondary }}
                >
                  Hyperdash is your
                </h1>
                <div className="h-12 flex items-center justify-center">
                  <span
                    className="text-3xl md:text-4xl font-semibold inline-block"
                    style={{ color: colors.primary }}
                  >
                    Notepad, To Do List, Timer
                  </span>
                </div>
              </div>

              {/* Wallpaper selection grid */}
              <div className="w-full">
                <h2 
                  className="text-lg font-semibold mb-4 text-center"
                  style={{ color: colors.secondary }}
                >
                  Choose your wallpaper
                </h2>
                <div ref={wallpaperGridRef} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {WALLPAPER_PRESETS.map((preset, index) => {
                    const isSelected = selectedWallpaper === preset.url || selectedWallpaperIndex === index;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleWallpaperSelect(preset.url, index)}
                        className={`
                          relative aspect-video rounded-sm overflow-hidden
                          border-2 transition-all duration-200
                          ${isSelected 
                            ? 'border-white/50 shadow-lg scale-105 ring-2 ring-white/30' 
                            : 'border-white/20 hover:border-white/40 hover:scale-[1.02]'
                          }
                        `}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div 
                            className="absolute inset-0 border-2 border-white/50"
                            style={{ boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.2)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Continue button */}
              <button
                onClick={handleContinue}
                disabled={!selectedWallpaper}
                className={`
                  px-8 py-3 rounded-sm border transition-all duration-200
                  ${selectedWallpaper
                    ? 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50 hover:shadow-white/20 cursor-pointer animate-button-pulse'
                    : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                  }
                `}
                style={{ color: colors.button }}
              >
                Continue
              </button>
            </div>
          </Widget>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  return (
    <ColorProvider>
      <div className="min-h-screen w-full">
        <OnboardingContent onComplete={onComplete} />
      </div>
    </ColorProvider>
  );
}

