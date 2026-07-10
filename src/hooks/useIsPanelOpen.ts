import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gifcreator-panel-open';

function readFromStorage(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

function writeToStorage(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable (private mode, sandboxed iframe) — silently ignore
  }
}

/**
 * Manages the open/closed state of the settings panel with localStorage persistence.
 *
 * - Reads initial state from `localStorage` key `gifcreator-panel-open`
 * - Defaults to `true` if the key is absent or `localStorage` throws
 * - Returns `[isPanelOpen, toggle]`
 * - `toggle` inverts the state and persists the new value to `localStorage`
 */
export function useIsPanelOpen(): [boolean, () => void] {
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(() => readFromStorage());

  const toggle = useCallback(() => {
    setIsPanelOpen((prev) => {
      const next = !prev;
      writeToStorage(next);
      return next;
    });
  }, []);

  return [isPanelOpen, toggle];
}
