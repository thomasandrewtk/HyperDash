'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';

interface SystemInfo {
  browser: string;
  screenSize: string;
  storageUsage: string;
  uptime: string;
}

export default function SystemInfoWidget() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [startTime] = useState(Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wallpaperPreview, setWallpaperPreview] = useState<string | null>(null);
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(() => {
    const saved = getFromLocalStorage('clockFormat');
    return (saved === '24h' ? '24h' : '12h') as '12h' | '24h';
  });
  const { colors } = useReactiveColors();

  useEffect(() => {
    const updateInfo = () => {
      // Get browser info
      const userAgent = navigator.userAgent;
      let browser = 'Unknown';
      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        browser = 'Chrome';
      } else if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browser = 'Safari';
      } else if (userAgent.includes('Edg')) {
        browser = 'Edge';
      }

      // Get screen size
      const screenSize = `${window.screen.width} × ${window.screen.height}`;

      // Calculate storage usage
      let storageUsage = '0 KB';
      try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key) || '';
            total += key.length + value.length;
          }
        }
        storageUsage = total < 1024 
          ? `${total} B` 
          : total < 1024 * 1024 
            ? `${(total / 1024).toFixed(2)} KB`
            : `${(total / (1024 * 1024)).toFixed(2)} MB`;
      } catch (error) {
        storageUsage = 'Unknown';
      }

      // Calculate uptime (time since page loaded)
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = uptimeSeconds % 60;
      const uptime = hours > 0 
        ? `${hours}h ${minutes}m ${seconds}s`
        : minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`;

      setInfo({
        browser,
        screenSize,
        storageUsage,
        uptime,
      });
    };

    updateInfo();
    const interval = setInterval(updateInfo, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Load wallpaper preview on mount
  useEffect(() => {
    const savedWallpaper = getFromLocalStorage('wallpaper');
    if (savedWallpaper) {
      setWallpaperPreview(savedWallpaper);
    }
  }, []);

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setWallpaperPreview(dataUrl);
        saveToLocalStorage('wallpaper', dataUrl);
        // Trigger custom event to update dashboard
        window.dispatchEvent(new CustomEvent('wallpaperChanged', { detail: dataUrl }));
      }
    };
    reader.onerror = () => {
      alert('Error reading image file');
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallpaper = () => {
    setWallpaperPreview(null);
    removeFromLocalStorage('wallpaper');
    // Trigger custom event to reset to default
    window.dispatchEvent(new CustomEvent('wallpaperChanged', { detail: null }));
  };

  const handleClockFormatChange = (format: '12h' | '24h') => {
    setClockFormat(format);
    saveToLocalStorage('clockFormat', format);
    // Trigger event for clock widget to update
    window.dispatchEvent(new CustomEvent('clockFormatChanged', { detail: format }));
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This will reset todos, notes, pomodoro timer, and settings. This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    try {
      const data: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hyperdash-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data');
      console.error(error);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (confirm('Import data? This will overwrite your current data.')) {
            localStorage.clear();
            Object.keys(data).forEach(key => {
              if (data[key] !== null) {
                localStorage.setItem(key, data[key]);
              }
            });
            window.location.reload();
          }
        } catch (error) {
          alert('Error importing data. Invalid file format.');
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!info) {
    return (
      <Widget title="System Info">
        <p style={{ color: colors.secondary }}>Loading...</p>
      </Widget>
    );
  }

  return (
    <>
      <Widget title="System Info">
        <div className="flex-1 flex flex-col">
          <div className="space-y-2 text-xs flex-1">
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span style={{ color: colors.secondary }}>Browser:</span>
              <span style={{ color: colors.primary }}>{info.browser}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span style={{ color: colors.secondary }}>Screen:</span>
              <span style={{ color: colors.primary }}>{info.screenSize}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span style={{ color: colors.secondary }}>Storage:</span>
              <span style={{ color: colors.primary }}>{info.storageUsage}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.secondary }}>Uptime:</span>
              <span style={{ color: colors.primary }}>{info.uptime}</span>
            </div>
          </div>
          <div className="flex justify-end mt-3 pt-2 border-t border-white/10">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="
                px-3 py-1.5
                bg-white/10
                border border-white/30
                rounded-sm
                hover:bg-white/15
                hover:border-white/50
                hover:shadow-md hover:shadow-white/20
                transition-all duration-200
                font-mono
                text-xs
                active:scale-95
              "
              style={{
                color: colors.button,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            >
              Settings
            </button>
          </div>
        </div>
      </Widget>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSettingsOpen(false);
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className="
              relative z-10
              bg-black/40 backdrop-blur-xl
              border border-white/20
              rounded-sm
              p-6
              max-w-md w-full
              shadow-lg
            "
            style={{
              color: colors.primary,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 
              className="text-xl font-semibold mb-4 border-b border-white/10 pb-2 font-mono"
              style={{ color: colors.secondary }}
            >
              Settings
            </h2>
            
            {/* About Section */}
            <div className="space-y-3 mb-6">
              <h3 
                className="text-sm font-semibold font-mono"
                style={{ color: colors.secondary }}
              >
                About
              </h3>
              <div className="flex flex-col items-center space-y-3">
                <img
                  src="/hyperdash-logo-transparent.png"
                  alt="HyperDash Logo"
                  className="h-16 w-auto"
                />
                <div className="text-xs space-y-2 text-center" style={{ color: colors.primary }}>
                  <p>
                    <span style={{ color: colors.secondary }}>HyperDash</span>
                  </p>
                  <p>
                    Your reactive personal dashboard.
                  </p>
                  <p>
                    Built with Next.js, TypeScript, and Tailwind CSS.
                  </p>
                </div>
              </div>
            </div>

            {/* Clock Format Section */}
            <div className="space-y-3 mb-6">
              <h3 
                className="text-sm font-semibold font-mono border-b border-white/10 pb-1"
                style={{ color: colors.secondary }}
              >
                Clock Format
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleClockFormatChange('12h')}
                  className={`
                    flex-1 px-3 py-2
                    border rounded-sm
                    transition-all duration-200
                    font-mono text-xs
                    ${clockFormat === '12h' 
                      ? 'bg-white/15 border-white/50' 
                      : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50'
                    }
                  `}
                  style={{
                    color: colors.button,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  12 Hour
                </button>
                <button
                  onClick={() => handleClockFormatChange('24h')}
                  className={`
                    flex-1 px-3 py-2
                    border rounded-sm
                    transition-all duration-200
                    font-mono text-xs
                    ${clockFormat === '24h' 
                      ? 'bg-white/15 border-white/50' 
                      : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50'
                    }
                  `}
                  style={{
                    color: colors.button,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  24 Hour
                </button>
              </div>
            </div>

            {/* Wallpaper Section */}
            <div className="space-y-3 mb-6">
              <h3 
                className="text-sm font-semibold font-mono border-b border-white/10 pb-1"
                style={{ color: colors.secondary }}
              >
                Wallpaper
              </h3>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="wallpaper-upload"
                    className="
                      block
                      px-3 py-2
                      bg-white/10
                      border border-white/30
                      rounded-sm
                      hover:bg-white/15
                      hover:border-white/50
                      cursor-pointer
                      transition-all duration-200
                      font-mono
                      text-xs
                      text-center
                    "
                    style={{
                      color: colors.button,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    Upload Image
                  </label>
                  <input
                    id="wallpaper-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperUpload}
                    className="hidden"
                  />
                </div>
                
                {wallpaperPreview && (
                  <div className="space-y-2">
                    <div className="text-xs" style={{ color: colors.secondary }}>
                      Preview:
                    </div>
                    <div className="relative w-full h-32 border border-white/20 rounded-sm overflow-hidden">
                      <img
                        src={wallpaperPreview}
                        alt="Wallpaper preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={handleResetWallpaper}
                      className="
                        w-full
                        px-3 py-1.5
                        bg-white/10
                        border border-white/30
                        rounded-sm
                        hover:bg-white/15
                        hover:border-white/50
                        transition-all duration-200
                        font-mono
                        text-xs
                      "
                      style={{
                        color: colors.button,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      Reset to Default
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Data Management Section */}
            <div className="space-y-3 mb-6">
              <h3 
                className="text-sm font-semibold font-mono border-b border-white/10 pb-1"
                style={{ color: colors.secondary }}
              >
                Data Management
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportData}
                  className="
                    px-3 py-2
                    bg-white/10
                    border border-white/30
                    rounded-sm
                    hover:bg-white/15
                    hover:border-white/50
                    transition-all duration-200
                    font-mono text-xs
                  "
                  style={{
                    color: colors.button,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Export
                </button>
                <button
                  onClick={handleImportData}
                  className="
                    px-3 py-2
                    bg-white/10
                    border border-white/30
                    rounded-sm
                    hover:bg-white/15
                    hover:border-white/50
                    transition-all duration-200
                    font-mono text-xs
                  "
                  style={{
                    color: colors.button,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Import
                </button>
              </div>
              <button
                onClick={handleClearAllData}
                className="
                  w-full px-3 py-2
                  bg-red-900/20
                  border border-red-500/30
                  rounded-sm
                  hover:bg-red-900/30
                  hover:border-red-500/50
                  transition-all duration-200
                  font-mono text-xs
                "
                style={{
                  color: colors.button,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                Clear All Data
              </button>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="
                  px-4 py-2
                  bg-white/10
                  border border-white/30
                  rounded-sm
                  hover:bg-white/15
                  hover:border-white/50
                  hover:shadow-md hover:shadow-white/20
                  transition-all duration-200
                  font-mono
                  text-sm
                  active:scale-95
                "
                style={{
                  color: colors.button,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

