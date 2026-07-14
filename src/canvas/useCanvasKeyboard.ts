import { useEffect } from 'react';
import { fabric } from 'fabric';

interface UseCanvasKeyboardProps {
  canvas: fabric.Canvas | null;
  undo: () => void;
  redo: () => void;
  saveState: () => void;
}

export function useCanvasKeyboard({ canvas, undo, redo, saveState }: UseCanvasKeyboardProps) {
  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const activeObjects = canvas.getActiveObjects();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj) => {
            // Do not delete background image or locked layers
            if ((obj as any).isBackgroundImage || (obj as any).locked) return;
            canvas.remove(obj);
          });
          canvas.discardActiveObject();
          canvas.renderAll();
          saveState();
          e.preventDefault();
        }
      } else if (e.key.startsWith('Arrow')) {
        if (activeObjects.length > 0) {
          const nudge = e.shiftKey ? 10 : 1;
          let moved = false;

          activeObjects.forEach((obj) => {
            if ((obj as any).locked) return;
            moved = true;
            switch (e.key) {
              case 'ArrowUp':
                obj.top = (obj.top || 0) - nudge;
                break;
              case 'ArrowDown':
                obj.top = (obj.top || 0) + nudge;
                break;
              case 'ArrowLeft':
                obj.left = (obj.left || 0) - nudge;
                break;
              case 'ArrowRight':
                obj.left = (obj.left || 0) + nudge;
                break;
            }
            obj.setCoords();
          });

          if (moved) {
            canvas.renderAll();
            saveState();
            e.preventDefault();
          }
        }
      } else if (e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key.toLowerCase() === 'a') {
          // Select all objects (except background and locked ones)
          e.preventDefault();
          const objs = canvas.getObjects().filter(o => !(o as any).isBackgroundImage && !(o as any).locked);
          if (objs.length > 0) {
            canvas.discardActiveObject();
            const sel = new fabric.ActiveSelection(objs, { canvas });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, undo, redo, saveState]);
}
