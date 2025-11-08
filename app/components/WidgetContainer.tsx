'use client';

import React, { Suspense, lazy, useMemo } from 'react';
import { WidgetType } from '@/app/lib/widgetRegistry';

interface WidgetContainerProps {
  position: number; // Position slot number (1-5)
  widgetType: WidgetType | null; // Widget type or null for empty
  widgetProps?: Record<string, any>; // Props to pass to widget
  isFocused?: boolean; // Whether this widget is focused
  isMouseActive?: boolean; // Whether mouse has moved recently
  keyboardControl?: boolean; // Whether keyboard has control (prevents mouse hover from changing focus)
  setFocusedPositionFromMouse?: (position: number | null) => void; // Function to set focus from mouse
}

// Create lazy-loaded components for each widget type
// These are created at module level for proper code splitting
const lazyWidgets: Record<WidgetType, React.LazyExoticComponent<React.ComponentType<any>>> = {
  clock: lazy(() => import('../components/ClockWidget')),
  weather: lazy(() => import('../components/WeatherWidget')),
  system: lazy(() => import('../components/SystemInfoWidget')),
  todo: lazy(() => import('../components/TodoWidget')),
  notepad: lazy(() => import('../components/NotepadWidget')),
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
  isMouseActive = false,
  keyboardControl = false,
  setFocusedPositionFromMouse,
}: WidgetContainerProps) {
  const handleMouseEnter = () => {
    // When mouse is active (has moved recently), hover can change focus
    // The setFocusedPositionFromMouse function will check keyboardControl internally
    if (isMouseActive && setFocusedPositionFromMouse && widgetType !== null) {
      setFocusedPositionFromMouse(position);
    }
  };
  // Get the lazy component for this widget type
  const LazyWidget = useMemo(() => {
    if (!widgetType) return null;
    return lazyWidgets[widgetType];
  }, [widgetType]);

  // Empty slot - render empty container
  if (!widgetType || !LazyWidget) {
    return (
      <div
        id={`widget-${position}`}
        data-widget-position={position}
        data-focused={isFocused}
        className="h-full min-h-0"
        onMouseEnter={handleMouseEnter}
      />
    );
  }

  // Render widget with Suspense for loading state
  return (
    <div
      id={`widget-${position}`}
      data-widget-position={position}
      data-focused={isFocused}
      className="h-full min-h-0"
      onMouseEnter={handleMouseEnter}
    >
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-sm opacity-50">Loading...</div>
          </div>
        }
      >
        <LazyWidget {...widgetProps} isFocused={isFocused} />
      </Suspense>
    </div>
  );
}

