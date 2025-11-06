'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import NotepadWidget from './NotepadWidget';
import TodoWidget from './TodoWidget';
import WeatherWidget from './WeatherWidget';
import ClockWidget from './ClockWidget';
import SystemInfoWidget from './SystemInfoWidget';
import Image from 'next/image';
import { getFromLocalStorage } from '@/app/lib/utils';
import { ColorProvider } from './ColorContext';

export default function Dashboard() {
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  useEffect(() => {
    // Load wallpaper from localStorage on mount
    const savedWallpaper = getFromLocalStorage('wallpaper');
    if (savedWallpaper) {
      setWallpaper(savedWallpaper);
    }

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

  const defaultWallpaper = '/Gradient_18_16-9.png';

  return (
    <ColorProvider>
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
            <WeatherWidget />
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
    </ColorProvider>
  );
}

