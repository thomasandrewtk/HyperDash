'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import { ColorProvider, useReactiveColors } from './ColorContext';
import { getFromLocalStorage } from '@/app/lib/utils';

interface KeyboardShortcutsScreenProps {
  onClose: () => void;
  fromOnboarding?: boolean;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    key: string;
    description: string;
  }>;
}

function KeyboardShortcutsContent({ onClose, fromOnboarding = false }: KeyboardShortcutsScreenProps) {
  const { colors } = useReactiveColors();
  const [widgetMounted, setWidgetMounted] = useState(false);
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  useEffect(() => {
    setWidgetMounted(true);
    // Load wallpaper from localStorage
    const savedWallpaper = getFromLocalStorage('wallpaper');
    if (savedWallpaper) {
      setWallpaper(savedWallpaper);
    } else {
      // Use default wallpaper if none saved
      setWallpaper('/Gradient_18_16-9.png');
    }
  }, []);

  // Handle keyboard shortcuts based on context
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fromOnboarding) {
        // From onboarding: Enter to continue
        if (e.key === 'Enter') {
          e.preventDefault();
          onClose();
        }
      } else {
        // From settings: Escape to close
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, fromOnboarding]);

  const shortcutGroups: ShortcutGroup[] = [
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

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Background image */}
      <div className="fixed inset-0 z-0 bg-black">
        {wallpaper && (
          <img
            src={wallpaper}
            alt="Wallpaper background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: '100vw', height: '100vh' }}
          />
        )}
      </div>

      {/* Content with centered widget */}
      <div className="relative z-10 h-screen flex items-center justify-center p-4">
        <div 
          className={`w-full max-w-3xl h-[85vh] max-h-[85vh] transition-opacity duration-300 ${
            widgetMounted ? 'animate-widget-entrance' : 'opacity-0 translate-y-4'
          }`}
        >
          <Widget className="h-full max-h-full">
            <div className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="text-center border-b border-white/10 pb-4 flex-shrink-0">
                <h1 
                  className="text-2xl md:text-3xl font-semibold mb-2"
                  style={{ color: colors.secondary }}
                >
                  Keyboard Shortcuts
                </h1>
              </div>

              {/* Shortcuts Groups */}
                  <div className="space-y-6">
                {shortcutGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-3">
                    <h2 
                      className="text-lg font-semibold border-b border-white/10 pb-1 font-mono"
                      style={{ color: colors.secondary }}
                    >
                      {group.title}
                    </h2>
                    <div className="space-y-2">
                      {group.shortcuts.map((shortcut, index) => (
                        <div 
                          key={index}
                          className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0"
                        >
                          <span 
                            className="text-sm flex-1"
                            style={{ color: colors.primary }}
                          >
                            {shortcut.description}
                          </span>
                          <kbd 
                            className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-sm text-xs font-mono whitespace-nowrap"
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
                </div>
              </div>

              {/* Fixed Button at Bottom */}
              <div className="flex justify-center items-center gap-3 pt-4 border-t border-white/10 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="
                    px-6 py-2
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
                  {fromOnboarding ? 'Continue' : 'Close'}
                </button>
                {fromOnboarding ? (
                  <span 
                    className="text-xs font-mono"
                    style={{ color: colors.primary }}
                  >
                    press <strong style={{ color: colors.secondary }}>Enter</strong> ⏎
                  </span>
                ) : (
                  <span 
                    className="text-xs font-mono"
                    style={{ color: colors.primary }}
                  >
                    press <strong style={{ color: colors.secondary }}>Esc</strong> ←
                  </span>
                )}
              </div>
            </div>
          </Widget>
        </div>
      </div>
    </div>
  );
}

export default function KeyboardShortcutsScreen({ onClose, fromOnboarding = false }: KeyboardShortcutsScreenProps) {
  return (
    <ColorProvider>
      <KeyboardShortcutsContent onClose={onClose} fromOnboarding={fromOnboarding} />
    </ColorProvider>
  );
}

