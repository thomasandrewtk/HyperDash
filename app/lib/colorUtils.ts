/**
 * Color utility functions for analyzing wallpaper images and calculating reactive colors
 */

export interface ColorPalette {
  primary: string;      // Main content text (equivalent to green-300)
  secondary: string;    // Labels/headings (equivalent to green-400)
  placeholder: string;  // Placeholder text (equivalent to green-500/80)
  muted: string;        // Muted text (equivalent to green-600)
  button: string;       // Button text (equivalent to green-300)
}

/**
 * Default green color palette (RGB values)
 */
const DEFAULT_PALETTE: ColorPalette = {
  primary: 'rgb(134, 239, 172)',      // green-300
  secondary: 'rgb(74, 222, 128)',     // green-400
  placeholder: 'rgba(34, 197, 94, 0.8)', // green-500/80
  muted: 'rgb(22, 163, 74)',          // green-600
  button: 'rgb(134, 239, 172)',      // green-300
};

/**
 * Parse RGB string to RGB values
 */
function parseRGB(rgb: string): { r: number; g: number; b: number } | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  const matchAlpha = rgb.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (matchAlpha) {
    return {
      r: parseInt(matchAlpha[1], 10),
      g: parseInt(matchAlpha[2], 10),
      b: parseInt(matchAlpha[3], 10),
    };
  }
  return null;
}


/**
 * Adjust brightness of an RGB color
 */
function adjustBrightness(r: number, g: number, b: number, factor: number): string {
  // Clamp factor between 0.5 and 1.5
  const clampedFactor = Math.max(0.5, Math.min(1.5, factor));
  
  const newR = Math.round(Math.min(255, Math.max(0, r * clampedFactor)));
  const newG = Math.round(Math.min(255, Math.max(0, g * clampedFactor)));
  const newB = Math.round(Math.min(255, Math.max(0, b * clampedFactor)));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}

/**
 * Analyze wallpaper image and calculate brightness
 * Returns normalized brightness (0-1, where 0 is black and 1 is white)
 */
export async function analyzeWallpaperBrightness(imageSrc: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Sample image at reduced resolution for performance
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;
        
        let totalBrightness = 0;
        const pixelCount = sampleSize * sampleSize;
        
        // Calculate average brightness
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Weighted brightness calculation (human eye sensitivity)
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          totalBrightness += brightness;
        }
        
        const averageBrightness = totalBrightness / pixelCount;
        // Normalize to 0-1 scale
        const normalizedBrightness = averageBrightness / 255;
        
        resolve(normalizedBrightness);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageSrc;
  });
}

/**
 * Calculate reactive color palette based on wallpaper brightness
 */
export function calculateReactiveColors(brightness: number): ColorPalette {
  // Calculate adjustment factor based on brightness
  // Dark wallpapers (low brightness) need brighter text
  // Light wallpapers (high brightness) need darker text
  let adjustmentFactor = 1.0;
  
  if (brightness < 0.3) {
    // Dark wallpaper: increase brightness of text colors
    const darkFactor = 1 + (0.3 - brightness) * 0.8; // 1.0 to 1.24
    adjustmentFactor = darkFactor;
  } else if (brightness > 0.7) {
    // Light wallpaper: decrease brightness of text colors
    const lightFactor = 1 - (brightness - 0.7) * 0.6; // 1.0 to 0.82
    adjustmentFactor = lightFactor;
  }
  // Medium brightness (0.3-0.7): minimal adjustment
  
  // Apply adjustment to each color in the palette
  const palette: ColorPalette = { ...DEFAULT_PALETTE };
  
  Object.keys(palette).forEach((key) => {
    const colorKey = key as keyof ColorPalette;
    const rgbColor = palette[colorKey];
    const rgb = parseRGB(rgbColor);
    
    if (rgb) {
      // Adjust brightness while maintaining hue
      palette[colorKey] = adjustBrightness(rgb.r, rgb.g, rgb.b, adjustmentFactor);
    } else if (rgbColor.includes('rgba')) {
      // Handle rgba colors (placeholder)
      const match = rgbColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        const a = parseFloat(match[4]);
        const adjusted = adjustBrightness(r, g, b, adjustmentFactor);
        // Extract RGB values and reconstruct rgba
        const rgbMatch = adjusted.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          palette[colorKey] = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${a})`;
        }
      }
    }
  });
  
  return palette;
}

/**
 * Get default color palette
 */
export function getDefaultPalette(): ColorPalette {
  return { ...DEFAULT_PALETTE };
}

