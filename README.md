<div align="center">
  <img src="HyperDash-Logo-Transparent.png" alt="HyperDash Logo" width="300">
</div>

# HyperDash

Your reactive personal dashboard. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Reactive Design System**: 
  - Custom wallpaper support with automatic color adaptation
  - Text colors dynamically adjust based on wallpaper brightness for optimal contrast
  - Unified white/neutral borders that adapt to any background
- **Modular Widget System**: Three-layer architecture with dynamic loading and code splitting
  - Configurable widget positions (currently 5 slots, expandable)
  - Widgets are lazy-loaded and code-split for optimal performance
  - Widget configuration persists in localStorage
- **Tiling Layout**: CSS Grid-based layout with responsive design
  - Position-based system: Widgets assigned positions 1-5 (left-to-right, top-to-bottom)
  - Default layout: Top row (positions 1-3): Clock, Weather, System Info (33.33% height)
  - Bottom row (positions 4-5): Todo List, Notepad (66.66% height, 50/50 split)
  - Layout is configurable and will support full customization via UI in the future
- **Modern Aesthetic**: Dark theme with semi-transparent widgets, backdrop blur, and monospace fonts
- **Interactive Widgets**:
  - **Clock**: Real-time clock with date display, 12h/24h format toggle
  - **Weather**: Real-time weather data using Open-Meteo API (no API key required)
    - Current temperature, feels-like, humidity, wind speed
    - Daily high/low temperatures
    - 6-hour hourly forecast
    - Location-based (requires geolocation permission)
  - **Todo List**: Add, complete, remove, and drag-and-drop reorder todos with persistent storage
    - Keyboard shortcuts for efficient todo management (see Keyboard Shortcuts section)
    - New todos are added to the top of the list
    - Smart focus navigation between input and todo items
  - **Notepad**: Multi-tab text editor with auto-save to localStorage
    - Create multiple notepad tabs (up to 9)
    - Drag-and-drop tab reordering
    - Image support: Paste or upload images to create clickable links (e.g., `[Image #1]`) that open in a new tab
    - URL support: Paste URLs to automatically convert them to shortened hyperlinks (e.g., `[youtube.com]`) that open in a new tab
    - Images and URLs are not stored in localStorage (only link references), preventing quota issues
    - Per-tab image numbering that automatically renumbers when images are added or removed
    - Keyboard shortcuts for tab management and navigation (see Keyboard Shortcuts section)
  - **System Info**: Browser info, screen size, storage usage, and session uptime
- **Settings & Customization**:
  - Wallpaper upload and management
  - Clock format (12h/24h) preferences
  - Data export/import functionality
  - Clear all data option
- **Keyboard Shortcuts**: Global shortcuts for quick access to common actions
- **Widget Focus System**: Hyprland-inspired focus navigation with mouse and keyboard control
  - Visual highlighting of focused widgets
  - Keyboard shortcuts for direct widget access (1-9 keys) and cycling (Tab/Shift+Tab)
  - Intelligent precedence: keyboard takes control, mouse hover resumes after timeout
  - Focus follows cursor or keyboard naturally

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **React 19**

## Customization

### Wallpaper & Reactive Colors

HyperDash features a **reactive color system** that automatically adapts text colors based on your wallpaper's brightness:

- **Upload your own wallpaper**: Click the Settings button in System Info widget
- **Automatic color adjustment**: 
  - Dark wallpapers: Text colors are brightened for better contrast
  - Light wallpapers: Text colors are darkened for better readability
  - Medium wallpapers: Minimal adjustment
- **Color palette**: All text uses a green-based theme that adjusts dynamically
- **Borders**: Unified white/neutral borders that work with any wallpaper

### Weather Widget

The weather widget uses the **Open-Meteo API** (free, no API key required):
- Automatically detects your location via browser geolocation
- Provides real-time weather data, hourly forecasts, and conditions
- Updates every 10 minutes automatically
- Works without any configuration or API keys

## Modular Widget System

HyperDash uses a **three-layer modular architecture** for widgets:

### Architecture Layers

1. **Dashboard Layer**: Manages widget configuration, loads from localStorage, calculates layout
2. **Widget Container Layer**: Position slots (1-5) that lazy-load widgets on demand
3. **Widget Layer**: Individual widget components, code-split into separate chunks

### Key Features

- **Code Splitting**: Each widget is lazy-loaded and becomes its own chunk, only loaded when assigned to a slot
- **Position-Based Layout**: Widgets are assigned positions 1-5 (left-to-right, top-to-bottom)
- **Configuration Persistence**: Widget positions and assignments stored in localStorage
- **Scalable**: Easy to add new widgets by registering in the widget registry
- **Empty Slots**: Supports empty slots (widgetType: null) for future customization
- **Future-Ready**: Foundation for drag-and-drop reordering, widget enable/disable, and keyboard shortcuts

### Widget Configuration

Widget configuration is stored in localStorage under the key `'hyperdash-widget-config'`:

```typescript
[
  { position: 1, widgetType: 'clock' },
  { position: 2, widgetType: 'weather' },
  { position: 3, widgetType: 'system' },
  { position: 4, widgetType: 'todo' },
  { position: 5, widgetType: 'notepad' }
]
```

### Adding New Widgets

To add a new widget:
1. Create widget component file in `app/components/`
2. Register widget type in `app/lib/widgetRegistry.ts`
3. Add lazy import in `app/components/WidgetContainer.tsx`
4. Optionally add to default configuration in `app/lib/widgetConfig.ts`

See `.cursorrules` for detailed documentation on the widget system architecture.

## Storage

All data is stored in browser localStorage and persists across sessions:
- **Widget Configuration**: Widget positions and assignments (`hyperdash-widget-config`)
- **Todos**: Task list items and completion status
- **Notes**: Notepad content with auto-save (including multiple tabs)
  - Note: Image links in notepad use blob URLs that are session-only (not persisted)
  - Images can be re-added after page reload if needed
- **Wallpaper**: Custom uploaded wallpaper images (base64 encoded)
- **Color Settings**: Reactive color palette calculated from wallpaper
- **Preferences**: Clock format (12h/24h) and other settings

You can export/import all data through the Settings modal in the System Info widget.

## Keyboard Shortcuts

HyperDash includes global keyboard shortcuts for quick access to common actions, plus widget-specific shortcuts for efficient interaction.

### Global Shortcuts

- **`S`** - Open Settings Modal
- **`Esc`** - Close Any Modal + Defocus Text Editing
- **`Shift + W`** - Wallpaper Upload (opens file picker)
- **`Shift + C`** - Toggle Clock Format (12h ↔ 24h)
- **`Shift + E`** - Export Data
- **`Shift + I`** - Import Data

### Widget Focus Navigation

HyperDash features a **Hyprland-inspired focus system** for keyboard-driven widget navigation:

- **`1-9`** - Focus widget at position (1 = top-left, 2 = top-middle, etc.)
- **`Tab`** - Cycle focus forward (left-to-right, top-to-bottom, wraps around)
- **`Shift + Tab`** - Cycle focus backward (right-to-left, bottom-to-top, wraps around)

**Focus Behavior:**
- **Click-Based Focus**: Focus is established by clicking on widgets, not hovering
- **Visual Feedback**: Focused widgets are highlighted with enhanced border, shadow, and slight upward lift (only when focused)
- **Fast Transitions**: Visual focus changes happen instantly (150ms transition)
- **Empty Slot Skipping**: Tab cycling automatically skips empty widget slots
- **No Persistence**: Focus state resets on page reload

**Example Workflow:**
1. Press `1` to focus Clock widget → widget highlights instantly
2. Press `Tab` to cycle to Weather widget → focus moves smoothly
3. Click on Notepad widget → focus changes to Notepad
4. Press `Tab` again → cycles to next widget

### Widget-Specific Shortcuts

Widget shortcuts are **only active when the widget is focused** and **disabled when editing text** (typing in inputs, textareas, or contenteditable elements).

#### Clock Widget (When Focused)

- **`Space`** - Start/Pause Pomodoro Timer
- **`R`** - Reset Pomodoro Timer
- **`K`** - Skip Pomodoro Session

#### Todo Widget (When Focused)

- **`N`** - Focus New Todo Input
- **`C`** - Show/Hide Completed Todos
- **`X`** - Clear All Completed Todos (confirmation dialog)
- **`Arrow Down`** - Select Next Todo
- **`Arrow Up`** - Select Previous Todo
- **`Enter`** - Edit Selected Todo (or focus input if none selected)
- **`Space`** - Toggle Todo Completion (moves focus to next incomplete todo)
- **`Backspace`** - Delete Selected Todo (confirmation dialog)
- **`Escape`** - Close dialogs and clear selection
- **`Arrow Down`** (from input) - Move to first todo
- **`Arrow Up`** (from first todo) - Move to input field

**Todo Navigation:**
- New todos are added to the top of the list
- When completing a todo, focus automatically moves to the next incomplete todo
- If no incomplete todos remain after completion, focus moves to the input field
- When completed todos are hidden and focus is on a completed todo, focus returns to input

#### Notepad Widget (When Focused)

- **`Enter`** - Start Editing (Focus editor)
- **`Ctrl + T`** - New Tab
- **`Ctrl + W`** - Close Active Tab
- **`Ctrl + R`** - Rename Active Tab
- **`Ctrl + I`** - Add Image (opens file picker)
- **`Ctrl + Alt + Arrow Right`** - Cycle Tab Forward (macOS compatible)
- **`Ctrl + Alt + Arrow Left`** - Cycle Tab Backward (macOS compatible)
- **`Ctrl + 1-9`** - Switch to Tab by Number (1st tab, 2nd tab, etc.)

**Notepad Features:**
- Maximum 9 tabs per notepad
- Paste URLs to automatically convert them to shortened hyperlinks (e.g., `[youtube.com]`)
- Links open in new tabs when clicked
- Tab creation/closure includes confirmation dialogs for safety

### Notes

- Shortcuts are **disabled when editing text** (typing in inputs, textareas, or contenteditable elements) to prevent accidental triggers
- **`Esc` always works** even when editing text, allowing you to quickly defocus and close modals
- Widget shortcuts are **only active when the widget is focused**
- Modifier keys (CMD/Ctrl/Alt) are ignored for single-key shortcuts to prevent browser conflicts
- All shortcuts work globally across the dashboard, regardless of which widget is visible
- Focus shortcuts respect the position-based layout system (positions 1-5 in current 3+2 layout)

## License

MIT

