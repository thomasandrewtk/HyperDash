# HyperDash

Your reactive personal dashboard. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Tiling Layout**: CSS Grid-based tiled window system
- **Modern Aesthetic**: Dark theme with reactive colors, transparency, and backdrop blur
- **Interactive Widgets**:
  - **Clock**: Real-time clock with date display
  - **Weather**: Location-based weather (requires geolocation permission)
  - **Todo List**: Add, complete, and remove todos with persistent storage
  - **Notepad**: Text notes with auto-save to localStorage
  - **System Info**: Browser info, screen size, storage usage, and uptime

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

### Weather Widget

The weather widget currently uses mock data. To enable real weather data:

1. Sign up for a free API key at [OpenWeatherMap](https://openweathermap.org/api)
2. Create a `.env.local` file:
```
NEXT_PUBLIC_WEATHER_API_KEY=your_api_key_here
```
3. Update `WeatherWidget.tsx` to use the API key (see commented code)

### Color Scheme

Widget border colors can be customized in the `Dashboard.tsx` component:
- `green` - Default green borders
- `blue` - Blue borders
- `pink` - Pink borders
- `cyan` - Cyan borders

## Storage

All data (todos and notes) is stored in browser localStorage and persists across sessions.

## License

MIT

