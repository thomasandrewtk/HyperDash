'use client';

import { useState, useEffect, useRef } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';
import { useUploadThing } from '@/app/lib/uploadthing';
import { WALLPAPER_PRESETS, isPresetWallpaper } from '@/app/lib/wallpaperConfig';

interface SystemInfo {
  browser: string;
  screenSize: string;
  storageUsage: string;
  uptime: string;
}

export default function SystemInfoWidget({ isFocused }: { isFocused?: boolean }) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [startTime] = useState(Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'appearance' | 'data' | 'shortcuts'>('appearance');
  const [wallpaperPreview, setWallpaperPreview] = useState<string | null>(null);
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(() => {
    const saved = getFromLocalStorage('clockFormat');
    return (saved === '24h' ? '24h' : '12h') as '12h' | '24h';
  });
  const { colors } = useReactiveColors();
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("wallpaperUploader");

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

  // Reset category to appearance when settings open
  useEffect(() => {
    if (isSettingsOpen) {
      setSelectedCategory('appearance');
    }
  }, [isSettingsOpen]);

  // Handle Tab/Shift+Tab to cycle through settings tabs
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is editing text
      const activeElement = document.activeElement;
      const isEditing = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       (activeElement instanceof HTMLElement && activeElement.contentEditable === 'true');
      
      if (isEditing) {
        return; // Let normal text editing work
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        
        const tabs: Array<'appearance' | 'data' | 'shortcuts'> = ['appearance', 'data', 'shortcuts'];
        const currentIndex = tabs.indexOf(selectedCategory);
        
        if (e.shiftKey) {
          // Shift+Tab - cycle backward
          const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
          setSelectedCategory(tabs[prevIndex]);
        } else {
          // Tab - cycle forward
          const nextIndex = (currentIndex + 1) % tabs.length;
          setSelectedCategory(tabs[nextIndex]);
        }
      }
    };

    // Use capture phase to catch Tab before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isSettingsOpen, selectedCategory]);

  // Keyboard shortcuts data
  const shortcutGroups = [
    {
      title: 'Global Shortcuts',
      shortcuts: [
        { key: '1-9', description: 'Focus widget by position' },
        { key: 'Tab', description: 'Cycle forward through widgets' },
        { key: 'Shift + Tab', description: 'Cycle backward through widgets' },
        { key: 'S', description: 'Open Settings' },
        { key: 'Shift + W', description: 'Upload wallpaper' },
        { key: 'Shift + C', description: 'Toggle clock format' },
        { key: 'Shift + E', description: 'Export data' },
        { key: 'Shift + I', description: 'Import data' },
        { key: 'Escape', description: 'Close modals/dialogs' },
      ],
    },
    {
      title: 'Settings',
      shortcuts: [
        { key: 'Tab', description: 'Cycle forward through settings tabs' },
        { key: 'Shift + Tab', description: 'Cycle backward through settings tabs' },
        { key: 'Escape', description: 'Close Settings' },
      ],
    },
    {
      title: 'Clock Widget',
      shortcuts: [
        { key: 'Space', description: 'Start/Pause Pomodoro timer' },
        { key: 'R', description: 'Reset Pomodoro timer' },
        { key: 'K', description: 'Skip Pomodoro session' },
      ],
    },
    {
      title: 'Todo Widget',
      shortcuts: [
        { key: 'N', description: 'Focus new todo input' },
        { key: 'C', description: 'Toggle show/hide completed todos' },
        { key: 'X', description: 'Clear all completed todos' },
        { key: '↑ / ↓', description: 'Navigate todos' },
        { key: 'Enter', description: 'Edit selected todo (or focus input)' },
        { key: 'Space', description: 'Toggle completion of selected todo' },
        { key: 'Backspace', description: 'Delete selected todo' },
        { key: 'Escape', description: 'Clear selection / Close dialogs' },
      ],
    },
    {
      title: 'Notepad Widget',
      shortcuts: [
        { key: 'Enter', description: 'Focus editor' },
        { key: 'Ctrl + T', description: 'New tab' },
        { key: 'Ctrl + W', description: 'Close tab' },
        { key: 'Ctrl + R', description: 'Rename tab' },
        { key: 'Ctrl + I', description: 'Add image' },
        { key: 'Ctrl + Alt + ← / →', description: 'Cycle tabs' },
        { key: 'Ctrl + 1-9', description: 'Switch to tab by number' },
      ],
    },
  ];

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };

    const handleCloseModals = () => {
      setIsSettingsOpen(false);
      // Defocus any active text editing element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    const handleOpenWallpaperUpload = () => {
      if (wallpaperInputRef.current && !isUploading) {
        wallpaperInputRef.current.click();
      }
    };

    const handleToggleClockFormat = () => {
      const newFormat = clockFormat === '12h' ? '24h' : '12h';
      setClockFormat(newFormat);
      saveToLocalStorage('clockFormat', newFormat);
      // Trigger event for clock widget to update
      window.dispatchEvent(new CustomEvent('clockFormatChanged', { detail: newFormat }));
    };

    const handleExportDataEvent = () => {
      handleExportData();
    };

    const handleImportDataEvent = () => {
      handleImportData();
    };

    window.addEventListener('openSettings', handleOpenSettings);
    window.addEventListener('closeModals', handleCloseModals);
    window.addEventListener('openWallpaperUpload', handleOpenWallpaperUpload);
    window.addEventListener('toggleClockFormat', handleToggleClockFormat);
    window.addEventListener('exportData', handleExportDataEvent);
    window.addEventListener('importData', handleImportDataEvent);

    return () => {
      window.removeEventListener('openSettings', handleOpenSettings);
      window.removeEventListener('closeModals', handleCloseModals);
      window.removeEventListener('openWallpaperUpload', handleOpenWallpaperUpload);
      window.removeEventListener('toggleClockFormat', handleToggleClockFormat);
      window.removeEventListener('exportData', handleExportDataEvent);
      window.removeEventListener('importData', handleImportDataEvent);
    };
  }, [clockFormat, isUploading]);

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Reset input value to allow re-uploading the same file
    if (e.target) {
      e.target.value = '';
    }

    try {
      // Upload to UploadThing
      const uploadedFiles = await startUpload([file]);
      
      if (uploadedFiles && uploadedFiles.length > 0) {
        const fileUrl = uploadedFiles[0].url;
        setWallpaperPreview(fileUrl);
        saveToLocalStorage('wallpaper', fileUrl);
        // Trigger custom event to update dashboard
        window.dispatchEvent(new CustomEvent('wallpaperChanged', { detail: fileUrl }));
      }
    } catch (error) {
      console.error('Error uploading wallpaper:', error);
      alert('Error uploading image. Please try again.');
    }
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
      <Widget title="System Info" isFocused={isFocused}>
        <p style={{ color: colors.secondary }}>Loading...</p>
      </Widget>
    );
  }

  return (
    <>
      {/* Hidden file input - always rendered so keyboard shortcut can access it */}
      <input
        ref={wallpaperInputRef}
        id="wallpaper-upload"
        type="file"
        accept="image/*"
        onChange={handleWallpaperUpload}
        className="hidden"
      />
      <Widget title="System Info" isFocused={isFocused}>
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
            data-settings-modal="true"
            className="
              relative z-10
              bg-black/40 backdrop-blur-xl
              border border-white/20
              rounded-sm
              p-4
              max-w-2xl w-full
              h-[600px]
              shadow-lg
              flex flex-col
            "
            style={{
              color: colors.primary,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2 flex-shrink-0">
            <h2 
                className="text-xl font-semibold font-mono"
              style={{ color: colors.secondary }}
            >
              Settings
            </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="
                  px-3 py-1.5
                  bg-white/10
                  border border-white/30
                  rounded-sm
                  hover:bg-white/15
                  hover:border-white/50
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
                Close
              </button>
            </div>

            {/* Sidebar + Content Layout */}
            <div className="flex flex-1 min-h-0 gap-4">
              {/* Sidebar Navigation */}
              <div className="w-44 flex-shrink-0 border-r border-white/10 pr-4">
                <nav className="flex flex-col gap-1">
                  <button
                    onClick={() => setSelectedCategory('appearance')}
                    className={`
                      px-3 py-2
                      text-left
                      border rounded-sm
                      transition-all duration-200
                      font-mono text-xs
                      ${selectedCategory === 'appearance'
                        ? 'bg-white/15 border-white/50' 
                        : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50'
                      }
                    `}
                    style={{
                      color: colors.button,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    Appearance
                  </button>
                  <button
                    onClick={() => setSelectedCategory('data')}
                    className={`
                      px-3 py-2
                      text-left
                      border rounded-sm
                      transition-all duration-200
                      font-mono text-xs
                      ${selectedCategory === 'data'
                        ? 'bg-white/15 border-white/50' 
                        : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50'
                      }
                    `}
                    style={{
                      color: colors.button,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    About
                  </button>
                  <button
                    onClick={() => setSelectedCategory('shortcuts')}
                    className={`
                      px-3 py-2
                      text-left
                      border rounded-sm
                      transition-all duration-200
                      font-mono text-xs
                      ${selectedCategory === 'shortcuts'
                        ? 'bg-white/15 border-white/50' 
                        : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50'
                      }
                    `}
                    style={{
                      color: colors.button,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    Shortcuts
                  </button>
                </nav>
            </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {selectedCategory === 'appearance' && (
                  <div className="space-y-4">
                    {/* Clock Format */}
                    <div className="space-y-2">
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

                    {/* Wallpaper */}
                    <div className="space-y-2">
              <h3 
                className="text-sm font-semibold font-mono border-b border-white/10 pb-1"
                style={{ color: colors.secondary }}
              >
                Wallpaper
              </h3>
                {/* Preset Wallpapers */}
                {WALLPAPER_PRESETS.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                      {WALLPAPER_PRESETS.map((preset) => {
                        const isSelected = wallpaperPreview === preset.url;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setWallpaperPreview(preset.url);
                              saveToLocalStorage('wallpaper', preset.url);
                              window.dispatchEvent(new CustomEvent('wallpaperChanged', { detail: preset.url }));
                            }}
                            className={`
                              relative
                                  h-16
                              border rounded-sm
                              overflow-hidden
                              transition-all duration-200
                              ${isSelected 
                                ? 'border-white/50 ring-2 ring-white/30' 
                                : 'border-white/20 hover:border-white/40'
                              }
                            `}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                                <div className="text-xs font-mono" style={{ color: colors.button }}>
                                  ✓
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}

                      {/* Upload Custom Image - Inline */}
                  <label
                    htmlFor="wallpaper-upload"
                    className={`
                      block
                      px-3 py-2
                      border rounded-sm
                      transition-all duration-200
                      font-mono
                      text-xs
                      text-center
                      ${isUploading 
                        ? 'bg-white/5 border-white/20 cursor-not-allowed opacity-50' 
                        : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/50 cursor-pointer'
                      }
                    `}
                    style={{
                      color: colors.button,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Custom Image'}
                  </label>
                
                      {/* Current wallpaper preview - only show if custom */}
                      {wallpaperPreview && !isPresetWallpaper(wallpaperPreview) && (
                  <div className="space-y-2">
                          <div className="relative w-full h-24 border border-white/20 rounded-sm overflow-hidden">
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
                )}

                {selectedCategory === 'data' && (
                  <div className="space-y-4">
                    {/* About */}
                    <div className="space-y-2">
                      <h3 
                        className="text-sm font-semibold font-mono border-b border-white/10 pb-1"
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
                        <div className="text-sm font-semibold font-mono" style={{ color: colors.secondary }}>
                          HyperDash
                        </div>
                        <p 
                          className="text-xs text-center max-w-sm"
                          style={{ color: colors.primary }}
                        >
                          Your reactive personal dashboard.<br />
                          Built with Next.js, TypeScript, and Tailwind CSS.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-4">
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
                  </div>
                )}

                {selectedCategory === 'shortcuts' && (
                  <div className="space-y-4">
                    {shortcutGroups.map((group, groupIndex) => (
                      <div key={groupIndex} className="space-y-2">
                        <h3 
                          className="text-sm font-semibold font-mono border-b border-white/10 pb-1"
                          style={{ color: colors.secondary }}
                        >
                          {group.title}
                        </h3>
                        <div className="space-y-1.5">
                          {group.shortcuts.map((shortcut, index) => (
                            <div 
                              key={index}
                              className="flex items-start justify-between gap-4 py-1.5 border-b border-white/5 last:border-0"
                            >
                              <span 
                                className="text-xs flex-1"
                                style={{ color: colors.primary }}
                              >
                                {shortcut.description}
                              </span>
                              <kbd 
                                className="px-2 py-1 bg-white/10 border border-white/20 rounded-sm text-xs font-mono whitespace-nowrap flex-shrink-0"
                                style={{ color: colors.button }}
                              >
                                {shortcut.key}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

