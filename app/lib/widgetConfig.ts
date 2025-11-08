import { WidgetType } from './widgetRegistry';
import { getFromLocalStorage, saveToLocalStorage } from './utils';

export interface WidgetSlot {
  position: number; // 1-5 (or more later)
  widgetType: WidgetType | null; // null = empty slot
}

export type WidgetConfiguration = WidgetSlot[];

const STORAGE_KEY = 'hyperdash-widget-config';

/**
 * Default widget configuration
 * Position 1: Clock
 * Position 2: Weather
 * Position 3: System
 * Position 4: Todo
 * Position 5: Notepad
 */
const DEFAULT_CONFIGURATION: WidgetConfiguration = [
  { position: 1, widgetType: 'clock' },
  { position: 2, widgetType: 'weather' },
  { position: 3, widgetType: 'system' },
  { position: 4, widgetType: 'todo' },
  { position: 5, widgetType: 'notepad' },
];

/**
 * Get widget configuration from localStorage or return default
 */
export function getWidgetConfiguration(): WidgetConfiguration {
  const saved = getFromLocalStorage(STORAGE_KEY);
  if (!saved) {
    return DEFAULT_CONFIGURATION;
  }

  try {
    const parsed = JSON.parse(saved) as WidgetConfiguration;
    // Validate configuration structure
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CONFIGURATION;
  } catch (error) {
    console.error('Error parsing widget configuration:', error);
    return DEFAULT_CONFIGURATION;
  }
}

/**
 * Save widget configuration to localStorage
 */
export function saveWidgetConfiguration(config: WidgetConfiguration): void {
  try {
    saveToLocalStorage(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving widget configuration:', error);
  }
}

/**
 * Get widget slot by position
 */
export function getWidgetByPosition(
  position: number
): WidgetSlot | undefined {
  const config = getWidgetConfiguration();
  return config.find((slot) => slot.position === position);
}

/**
 * Get all widgets sorted by position
 */
export function getWidgetsSortedByPosition(): WidgetSlot[] {
  const config = getWidgetConfiguration();
  return [...config].sort((a, b) => a.position - b.position);
}

/**
 * Calculate layout slots for rendering
 * Positions 1-3 → top row (3 columns)
 * Positions 4-5 → bottom row (2 columns)
 * Future: Layout can be configurable
 */
export function getLayoutSlots(config: WidgetConfiguration): {
  topRow: WidgetSlot[];
  bottomRow: WidgetSlot[];
} {
  const sorted = [...config].sort((a, b) => a.position - b.position);
  
  const topRow = sorted.filter((slot) => slot.position >= 1 && slot.position <= 3);
  const bottomRow = sorted.filter((slot) => slot.position >= 4 && slot.position <= 5);

  // Ensure top row has 3 slots and bottom row has 2 slots
  // Fill with empty slots if needed
  while (topRow.length < 3) {
    const nextPosition = topRow.length + 1;
    topRow.push({ position: nextPosition, widgetType: null });
  }
  
  while (bottomRow.length < 2) {
    const nextPosition = bottomRow.length + 4;
    bottomRow.push({ position: nextPosition, widgetType: null });
  }

  return { topRow, bottomRow };
}

