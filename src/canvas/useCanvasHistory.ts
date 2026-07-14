import { useState, useCallback, useRef } from 'react';
import { fabric } from 'fabric';
import type { DrawingObject } from '../types';
import { serializeCanvasObjects, deserializeObjectsToCanvas } from './canvasSerializer';

export function useCanvasHistory() {
  const historyRef = useRef<DrawingObject[][]>([]);
  const redoRef = useRef<DrawingObject[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveState = useCallback((canvas: fabric.Canvas) => {
    const currentState = serializeCanvasObjects(canvas);
    
    // Check if the state actually changed compared to the last entry
    const lastState = historyRef.current[historyRef.current.length - 1];
    if (lastState && JSON.stringify(lastState) === JSON.stringify(currentState)) {
      return;
    }

    historyRef.current.push(currentState);
    redoRef.current = []; // Clear redo stack on new action
    
    // Cap history size to 50
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }

    setCanUndo(historyRef.current.length > 1);
    setCanRedo(false);
  }, []);

  const initHistory = useCallback((initialDrawings: DrawingObject[]) => {
    historyRef.current = [initialDrawings || []];
    redoRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const undo = useCallback((canvas: fabric.Canvas, onUpdate: (drawings: DrawingObject[]) => void) => {
    if (historyRef.current.length <= 1) return;

    const current = historyRef.current.pop()!;
    redoRef.current.push(current);

    const previous = historyRef.current[historyRef.current.length - 1];
    
    // Clear the drawing objects from canvas (keep background)
    canvas.getObjects().forEach((obj) => {
      if ((obj as any).drawingType && (obj as any).drawingType !== 'select') {
        canvas.remove(obj);
      }
    });

    deserializeObjectsToCanvas(previous, canvas, () => {
      canvas.renderAll();
      onUpdate(previous);
    });

    setCanUndo(historyRef.current.length > 1);
    setCanRedo(true);
  }, []);

  const redo = useCallback((canvas: fabric.Canvas, onUpdate: (drawings: DrawingObject[]) => void) => {
    if (redoRef.current.length === 0) return;

    const next = redoRef.current.pop()!;
    historyRef.current.push(next);

    canvas.getObjects().forEach((obj) => {
      if ((obj as any).drawingType && (obj as any).drawingType !== 'select') {
        canvas.remove(obj);
      }
    });

    deserializeObjectsToCanvas(next, canvas, () => {
      canvas.renderAll();
      onUpdate(next);
    });

    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
  }, []);

  return {
    saveState,
    initHistory,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
