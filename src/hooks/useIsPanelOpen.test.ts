import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsPanelOpen } from './useIsPanelOpen';

const STORAGE_KEY = 'gifcreator-panel-open';

describe('useIsPanelOpen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to true when localStorage has no entry', () => {
    const { result } = renderHook(() => useIsPanelOpen());
    expect(result.current[0]).toBe(true);
  });

  it('reads true from localStorage when stored as "true"', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useIsPanelOpen());
    expect(result.current[0]).toBe(true);
  });

  it('reads false from localStorage when stored as "false"', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useIsPanelOpen());
    expect(result.current[0]).toBe(false);
  });

  it('toggle inverts state from true to false', () => {
    const { result } = renderHook(() => useIsPanelOpen());
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](); // toggle
    });

    expect(result.current[0]).toBe(false);
  });

  it('toggle inverts state from false to true', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useIsPanelOpen());
    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](); // toggle
    });

    expect(result.current[0]).toBe(true);
  });

  it('toggle persists new value to localStorage', () => {
    const { result } = renderHook(() => useIsPanelOpen());

    act(() => {
      result.current[1](); // toggle: true → false
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('calling toggle twice returns to the original state', () => {
    const { result } = renderHook(() => useIsPanelOpen());
    const initial = result.current[0];

    act(() => { result.current[1](); });
    act(() => { result.current[1](); });

    expect(result.current[0]).toBe(initial);
  });

  it('falls back to true when localStorage throws on read', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { result } = renderHook(() => useIsPanelOpen());
    expect(result.current[0]).toBe(true);

    getItemSpy.mockRestore();
  });

  it('silently ignores localStorage errors on write', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { result } = renderHook(() => useIsPanelOpen());

    expect(() => {
      act(() => { result.current[1](); });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
