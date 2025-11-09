'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { WidgetType } from '@/app/lib/widgetRegistry';

interface WidgetContainerProps {
  position: number; // Position slot number (1-5)
  widgetType: WidgetType | null; // Widget type or null for empty
  widgetProps?: Record<string, any>; // Props to pass to widget
  isFocused?: boolean; // Whether this widget is focused
  setFocusedPositionFromMouse?: (position: number | null) => void; // Function to set focus from mouse click
}

// Create lazy-loaded components for each widget type
// These are created at module level for proper code splitting
const WidgetLoading = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-sm opacity-50">Loading...</div>
  </div>
);

const lazyWidgets: Record<WidgetType, React.ComponentType<any>> = {
  clock: dynamic(() => import('../components/ClockWidget'), {
    loading: WidgetLoading,
  }),
  weather: dynamic(() => import('../components/WeatherWidget'), {
    loading: WidgetLoading,
  }),
  system: dynamic(() => import('../components/SystemInfoWidget'), {
    loading: WidgetLoading,
  }),
  todo: dynamic(() => import('../components/TodoWidget'), {
    ssr: false,
    loading: WidgetLoading,
  }),
  notepad: dynamic(() => import('../components/NotepadWidget'), {
    ssr: false,
    loading: WidgetLoading,
  }),
};

/**
 * WidgetContainer - Container component that lazy loads widgets
 * Only loads widget component when widgetType is not null
 */
export default function WidgetContainer({
  position,
  widgetType,
  widgetProps = {},
  isFocused = false,
  setFocusedPositionFromMouse,
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Focus only changes on explicit click/interaction, not hover
    // Use mousedown instead of click for instant feedback (fires earlier in event cycle)
    if (setFocusedPositionFromMouse && widgetType !== null) {
      // Don't focus if clicking on interactive elements (buttons, inputs, etc.)
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      setFocusedPositionFromMouse(position);
    }
  };

  // Detect when text inputs within this widget receive focus and focus the widget
  useEffect(() => {
    if (!setFocusedPositionFromMouse || widgetType === null || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the focused element is a text input
      const isTextInput = 
        target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'button' && (target as HTMLInputElement).type !== 'submit' && (target as HTMLInputElement).type !== 'reset' && (target as HTMLInputElement).type !== 'checkbox' && (target as HTMLInputElement).type !== 'radio' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTextInput) {
        // Focus the widget when a text input receives focus
        setFocusedPositionFromMouse(position);
      }
    };

    // Use focusin event (bubbles) to catch focus on any descendant
    container.addEventListener('focusin', handleFocusIn);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
    };
  }, [position, widgetType, setFocusedPositionFromMouse]);

  // Get the lazy component for this widget type
  const LazyWidget = useMemo(() => {
    if (!widgetType) return null;
    return lazyWidgets[widgetType];
  }, [widgetType]);

  // Empty slot - render empty container
  if (!widgetType || !LazyWidget) {
    return (
      <div
        ref={containerRef}
        id={`widget-${position}`}
        data-widget-position={position}
        data-focused={isFocused}
        data-widget-container
        className="h-full min-h-0"
        onMouseDown={handleMouseDown}
      />
    );
  }

  // Render widget with Suspense for loading state
  return (
    <div
      ref={containerRef}
      id={`widget-${position}`}
      data-widget-position={position}
      data-focused={isFocused}
      data-widget-container
      className="h-full min-h-0"
      onMouseDown={handleMouseDown}
    >
      <LazyWidget {...widgetProps} isFocused={isFocused} />
    </div>
  );
}

