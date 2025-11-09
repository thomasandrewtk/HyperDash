/**
 * Preset wallpapers hosted on UploadThing
 * After uploading your wallpapers to UploadThing, add their URLs here
 * Format: https://<APP_ID>.ufs.sh/f/<FILE_KEY>
 */

export interface WallpaperPreset {
  id: string;
  name: string;
  url: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'wallpaper-1',
    name: 'Wallpaper 1',
    url: 'https://xu4g9pm3u3.ufs.sh/f/97KFKYzP6V3tD11nBuziRM0iatfldH786U9SD3FxynBAzh4G',
  },
  {
    id: 'wallpaper-2',
    name: 'Wallpaper 2',
    url: 'https://xu4g9pm3u3.ufs.sh/f/97KFKYzP6V3toiHLqtuUZtgBOqkW6Dx0sjNEwMVbCYf72edr',
  },
  {
    id: 'wallpaper-3',
    name: 'Wallpaper 3',
    url: 'https://xu4g9pm3u3.ufs.sh/f/97KFKYzP6V3tsAAUKGg6GZlXMfIbozn7HVq8pja623mB1T0L',
  },
  {
    id: 'wallpaper-4',
    name: 'Wallpaper 4',
    url: 'https://xu4g9pm3u3.ufs.sh/f/97KFKYzP6V3tyAmRXRZ8FL3JPKtiZcwNp0o1ufIbxT5mM7A4',
  },
  {
    id: 'wallpaper-5',
    name: 'Wallpaper 5',
    url: 'https://xu4g9pm3u3.ufs.sh/f/97KFKYzP6V3tspF02W6GZlXMfIbozn7HVq8pja623mB1T0LY',
  },
  {
    id: 'wallpaper-6',
    name: 'Wallpaper 6',
    url: 'https://xu4g9pm3u3.ufs.sh/f/97KFKYzP6V3tAgJkPD0m47CY8fbHkKBN0xQpIhuqg96OTtce',
  },
];

/**
 * Get preset wallpaper by ID
 */
export function getPresetWallpaper(id: string): WallpaperPreset | undefined {
  return WALLPAPER_PRESETS.find(preset => preset.id === id);
}

/**
 * Check if a URL is a preset wallpaper
 */
export function isPresetWallpaper(url: string): boolean {
  return WALLPAPER_PRESETS.some(preset => preset.url === url);
}

