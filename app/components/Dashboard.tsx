'use client';

import { useState, useEffect, useRef } from 'react';
import Widget from './Widget';
import NotepadWidget from './NotepadWidget';
import TodoWidget from './TodoWidget';
import WeatherWidget from './WeatherWidget';
import ClockWidget from './ClockWidget';
import SystemInfoWidget from './SystemInfoWidget';
import LoadingScreen from './LoadingScreen';
import Image from 'next/image';
import { getFromLocalStorage } from '@/app/lib/utils';
import { ColorProvider, useReactiveColors } from './ColorContext';

function DashboardContent() {
  const { isReady: colorsReady } = useReactiveColors();
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [wallpaperReady, setWallpaperReady] = useState(false);
  const [weatherReady, setWeatherReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const minDisplayTimeRef = useRef<number | null>(null);

  // Set minimum display time start when component mounts
  useEffect(() => {
    minDisplayTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Load wallpaper from localStorage on mount
    const savedWallpaper = getFromLocalStorage('wallpaper');
    if (savedWallpaper) {
      setWallpaper(savedWallpaper);
    }
    setWallpaperReady(true);

    // Listen for wallpaper changes
    const handleWallpaperChange = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setWallpaper(customEvent.detail);
    };

    window.addEventListener('wallpaperChanged', handleWallpaperChange);

    return () => {
      window.removeEventListener('wallpaperChanged', handleWallpaperChange);
    };
  }, []);

  // Track when all loading conditions are met
  useEffect(() => {
    if (colorsReady && wallpaperReady && weatherReady) {
      const now = Date.now();
      const startTime = minDisplayTimeRef.current || now;
      const elapsed = now - startTime;
      const remaining = Math.max(0, 300 - elapsed);
      
      setTimeout(() => {
        setIsLoading(false);
      }, remaining);
    }
  }, [colorsReady, wallpaperReady, weatherReady]);

  const handleWeatherLoadComplete = () => {
    setWeatherReady(true);
  };

  const defaultWallpaper = '/Gradient_18_16-9.png';

  return (
    <>
      <LoadingScreen isVisible={isLoading} />
      <div className="min-h-screen w-full relative">
        {/* Background image */}
        <div className="fixed inset-0 z-0">
          {wallpaper ? (
            <img
              src={wallpaper}
              alt="Wallpaper background"
              className="w-full h-full object-cover"
              style={{ width: '100vw', height: '100vh' }}
            />
          ) : (
            <Image
              src={defaultWallpaper}
              alt="Wallpaper background"
              fill
              className="object-cover"
              priority
            />
          )}
        </div>
        
        {/* Content with relative positioning */}
        <div className="relative z-10 h-screen p-4 flex flex-col overflow-hidden">
          {/* Top row - 1/3 height with 3 widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0 mb-4" style={{ height: '33.333%' }}>
            <div className="h-full">
              <ClockWidget />
            </div>
            <div className="h-full">
              <WeatherWidget onLoadComplete={handleWeatherLoadComplete} />
            </div>
            <div className="h-full">
              <SystemInfoWidget />
            </div>
          </div>
          
          {/* Bottom row - 2/3 height with Todo and Notepad split 50/50 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="h-full min-h-0">
              <TodoWidget />
            </div>
            <div className="h-full min-h-0">
              <NotepadWidget />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <ColorProvider>
      <DashboardContent />
    </ColorProvider>
  );
}

