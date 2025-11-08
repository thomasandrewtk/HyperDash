'use client';

import React, { Suspense, lazy, useMemo } from 'react';
import { WidgetType } from '@/app/lib/widgetRegistry';

interface WidgetContainerProps {
  position: number; // Position slot number (1-5)
  widgetType: WidgetType | null; // Widget type or null for empty
  widgetProps?: Record<string, any>; // Props to pass to widget
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
}: WidgetContainerProps) {
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
        className="h-full"
      />
    );
  }

  // Render widget with Suspense for loading state
  return (
    <div
      id={`widget-${position}`}
      data-widget-position={position}
      className="h-full"
    >
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-sm opacity-50">Loading...</div>
          </div>
        }
      >
        <LazyWidget {...widgetProps} />
      </Suspense>
    </div>
  );
}

