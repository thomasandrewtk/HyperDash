import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '../utils';

describe('localStorage utilities', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveToLocalStorage', () => {
    it('should save a value to localStorage', () => {
      saveToLocalStorage('testKey', 'testValue');
      expect(localStorage.getItem('testKey')).toBe('testValue');
    });

    it('should overwrite existing value', () => {
      saveToLocalStorage('testKey', 'original');
      saveToLocalStorage('testKey', 'updated');
      expect(localStorage.getItem('testKey')).toBe('updated');
    });

    it('should handle numbers as strings', () => {
      saveToLocalStorage('numberKey', '123');
      expect(localStorage.getItem('numberKey')).toBe('123');
    });
  });

  describe('getFromLocalStorage', () => {
    it('should retrieve a value from localStorage', () => {
      localStorage.setItem('testKey', 'testValue');
      expect(getFromLocalStorage('testKey')).toBe('testValue');
    });

    it('should return null for non-existent key', () => {
      expect(getFromLocalStorage('nonExistent')).toBeNull();
    });

    it('should return null when localStorage is empty', () => {
      expect(getFromLocalStorage('anyKey')).toBeNull();
    });
  });

  describe('removeFromLocalStorage', () => {
    it('should remove a value from localStorage', () => {
      localStorage.setItem('testKey', 'testValue');
      removeFromLocalStorage('testKey');
      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('should handle removing non-existent key gracefully', () => {
      expect(() => removeFromLocalStorage('nonExistent')).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should work together: save, get, remove', () => {
      // Save
      saveToLocalStorage('myKey', 'myValue');
      expect(getFromLocalStorage('myKey')).toBe('myValue');

      // Remove
      removeFromLocalStorage('myKey');
      expect(getFromLocalStorage('myKey')).toBeNull();
    });
  });
});

