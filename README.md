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
- **Tiling Layout**: CSS Grid-based layout with responsive design
  - Top row: Clock, Weather, System Info (33.33% height)
  - Bottom row: Todo List, Notepad (66.66% height, 50/50 split)
- **Modern Aesthetic**: Dark theme with semi-transparent widgets, backdrop blur, and monospace fonts
- **Interactive Widgets**:
  - **Clock**: Real-time clock with date display, 12h/24h format toggle
  - **Weather**: Real-time weather data using Open-Meteo API (no API key required)
    - Current temperature, feels-like, humidity, wind speed
    - Daily high/low temperatures
    - 6-hour hourly forecast
    - Location-based (requires geolocation permission)
  - **Todo List**: Add, complete, remove, and drag-and-drop reorder todos with persistent storage
  - **Notepad**: Text notes with auto-save to localStorage
  - **System Info**: Browser info, screen size, storage usage, and session uptime
- **Settings & Customization**:
  - Wallpaper upload and management
  - Clock format (12h/24h) preferences
  - Data export/import functionality
  - Clear all data option

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

## Storage

All data is stored in browser localStorage and persists across sessions:
- **Todos**: Task list items and completion status
- **Notes**: Notepad content with auto-save
- **Wallpaper**: Custom uploaded wallpaper images (base64 encoded)
- **Color Settings**: Reactive color palette calculated from wallpaper
- **Preferences**: Clock format (12h/24h) and other settings

You can export/import all data through the Settings modal in the System Info widget.

## License

MIT

