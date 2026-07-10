import { useState, useCallback, useRef } from 'react';

export interface UseHistoryStateReturn<T> {
  state: T;
  setState: (nextState: T | ((prev: T) => T), skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useHistoryState<T>(initialValue: T): UseHistoryStateReturn<T> {
  const [state, setCurrentState] = useState<T>(initialValue);
  const historyRef = useRef<T[]>([initialValue]);
  const pointerRef = useRef<number>(0);

  const setState = useCallback((nextState: T | ((prev: T) => T), skipHistory = false) => {
    setCurrentState((current) => {
      const resolved = typeof nextState === 'function' 
        ? (nextState as (prev: T) => T)(current) 
        : nextState;
      
      if (skipHistory) {
        // Update the current state value in history for the current pointer
        // so that it matches, but don't add a new history step.
        historyRef.current[pointerRef.current] = resolved;
        return resolved;
      }

      // If we are updating state and have redone steps, truncate the future history
      const nextHistory = historyRef.current.slice(0, pointerRef.current + 1);
      nextHistory.push(resolved);
      historyRef.current = nextHistory;
      pointerRef.current = nextHistory.length - 1;

      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    if (pointerRef.current > 0) {
      pointerRef.current -= 1;
      setCurrentState(historyRef.current[pointerRef.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current < historyRef.current.length - 1) {
      pointerRef.current += 1;
      setCurrentState(historyRef.current[pointerRef.current]);
    }
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [state];
    pointerRef.current = 0;
  }, [state]);

  const canUndo = pointerRef.current > 0;
  const canRedo = pointerRef.current < historyRef.current.length - 1;

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  };
}
