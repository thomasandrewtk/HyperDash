import { describe, it, expect } from 'vitest';
import {
  calculateReactiveColors,
  getDefaultPalette,
  ColorPalette,
} from '../colorUtils';

describe('colorUtils', () => {
  describe('getDefaultPalette', () => {
    it('should return the default color palette', () => {
      const palette = getDefaultPalette();
      
      expect(palette).toHaveProperty('primary');
      expect(palette).toHaveProperty('secondary');
      expect(palette).toHaveProperty('placeholder');
      expect(palette).toHaveProperty('muted');
      expect(palette).toHaveProperty('button');
      
      // Check that primary is green-300 equivalent
      expect(palette.primary).toBe('rgb(134, 239, 172)');
    });

    it('should return a new object each time (not a reference)', () => {
      const palette1 = getDefaultPalette();
      const palette2 = getDefaultPalette();
      
      expect(palette1).not.toBe(palette2);
      expect(palette1).toEqual(palette2);
    });
  });

  describe('calculateReactiveColors', () => {
    it('should return a ColorPalette with all required properties', () => {
      const palette = calculateReactiveColors(0.5);
      
      expect(palette).toHaveProperty('primary');
      expect(palette).toHaveProperty('secondary');
      expect(palette).toHaveProperty('placeholder');
      expect(palette).toHaveProperty('muted');
      expect(palette).toHaveProperty('button');
    });

    it('should adjust colors for dark wallpapers (brightness < 0.3)', () => {
      const darkPalette = calculateReactiveColors(0.2); // Dark wallpaper
      const defaultPalette = getDefaultPalette();
      
      // For dark wallpapers, colors should be brighter (higher RGB values)
      // We can check that the colors are different from default
      expect(darkPalette.primary).not.toBe(defaultPalette.primary);
      
      // Extract RGB values to verify brightness increased
      const darkMatch = darkPalette.primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      const defaultMatch = defaultPalette.primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      
      if (darkMatch && defaultMatch) {
        const darkR = parseInt(darkMatch[1], 10);
        const defaultR = parseInt(defaultMatch[1], 10);
        // For dark wallpapers, RGB values should be higher (brighter)
        expect(darkR).toBeGreaterThanOrEqual(defaultR);
      }
    });

    it('should adjust colors for light wallpapers (brightness > 0.7)', () => {
      const lightPalette = calculateReactiveColors(0.8); // Light wallpaper
      const defaultPalette = getDefaultPalette();
      
      // For light wallpapers, colors should be darker (lower RGB values)
      expect(lightPalette.primary).not.toBe(defaultPalette.primary);
      
      // Extract RGB values to verify brightness decreased
      const lightMatch = lightPalette.primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      const defaultMatch = defaultPalette.primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      
      if (lightMatch && defaultMatch) {
        const lightR = parseInt(lightMatch[1], 10);
        const defaultR = parseInt(defaultMatch[1], 10);
        // For light wallpapers, RGB values should be lower (darker)
        expect(lightR).toBeLessThanOrEqual(defaultR);
      }
    });

    it('should have minimal adjustment for medium brightness (0.3-0.7)', () => {
      const mediumPalette = calculateReactiveColors(0.5); // Medium brightness
      
      // Colors should still be valid RGB strings
      expect(mediumPalette.primary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
      expect(mediumPalette.secondary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it('should handle edge cases', () => {
      // Very dark
      expect(() => calculateReactiveColors(0.0)).not.toThrow();
      
      // Very light
      expect(() => calculateReactiveColors(1.0)).not.toThrow();
      
      // Exactly at thresholds
      expect(() => calculateReactiveColors(0.3)).not.toThrow();
      expect(() => calculateReactiveColors(0.7)).not.toThrow();
    });

    it('should preserve rgba format for placeholder', () => {
      const palette = calculateReactiveColors(0.5);
      
      // Placeholder should have rgba format with alpha
      expect(palette.placeholder).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
    });
  });
});

