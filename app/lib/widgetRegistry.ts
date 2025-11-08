import React from 'react';

export type WidgetType = 'clock' | 'weather' | 'system' | 'todo' | 'notepad';

export interface WidgetComponentProps {
  [key: string]: any;
}

// Dynamic import registry for code splitting
// Each widget is only loaded when assigned to a slot
const widgetComponents: Record<
  WidgetType,
  () => Promise<{ default: React.ComponentType<WidgetComponentProps> }>
> = {
  clock: () => import('../components/ClockWidget'),
  weather: () => import('../components/WeatherWidget'),
  system: () => import('../components/SystemInfoWidget'),
  todo: () => import('../components/TodoWidget'),
  notepad: () => import('../components/NotepadWidget'),
};

/**
 * Load a widget component dynamically
 * @param type - The widget type to load
 * @returns Promise resolving to the widget component
 */
export async function loadWidget(
  type: WidgetType
): Promise<React.ComponentType<WidgetComponentProps>> {
  const module = await widgetComponents[type]();
  return module.default;
}

/**
 * Check if a widget type is valid
 */
export function isValidWidgetType(type: string): type is WidgetType {
  return type in widgetComponents;
}

/**
 * Get all available widget types
 */
export function getAvailableWidgetTypes(): WidgetType[] {
  return Object.keys(widgetComponents) as WidgetType[];
}

