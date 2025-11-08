'use client';

import React from 'react';
import { useReactiveColors } from './ColorContext';

interface WidgetProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  isFocused?: boolean; // Whether this widget is focused
}

export default function Widget({ 
  title, 
  children, 
  className = '',
  isFocused = false,
}: WidgetProps) {
  const { colors } = useReactiveColors();

  return (
    <div 
      className={`
        bg-black/40 backdrop-blur-xl
        border-[1px] ${isFocused ? 'border-white/50' : 'border-white/20'}
        rounded-sm
        p-4
        ${isFocused ? 'shadow-xl -translate-y-[1px]' : 'shadow-lg'}
        transition-all duration-150
        relative
        h-full
        max-h-full
        flex flex-col
        overflow-hidden
        ${className}
      `}
      style={{
        color: colors.primary,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`,
      }}
    >
      {/* Subtle inner glow - only shows when widget is focused */}
      {isFocused && (
        <div 
          className="absolute inset-0 rounded-sm pointer-events-none opacity-100 transition-opacity duration-150"
          style={{
            boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.1)',
          }}
        />
      )}
      {title && (
        <h2 
          className="text-lg font-semibold mb-3 border-b border-white/10 pb-2 relative z-10 flex-shrink-0"
          style={{ color: colors.secondary }}
        >
          {title}
        </h2>
      )}
      <div className="text-sm relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}

