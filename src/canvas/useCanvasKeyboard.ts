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

    let _clipboard: fabric.Object | null = null;

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
      const activeObject = canvas.getActiveObject();

      if (e.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
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
              case 'ArrowUp': obj.top = (obj.top || 0) - nudge; break;
              case 'ArrowDown': obj.top = (obj.top || 0) + nudge; break;
              case 'ArrowLeft': obj.left = (obj.left || 0) - nudge; break;
              case 'ArrowRight': obj.left = (obj.left || 0) + nudge; break;
            }
            obj.setCoords();
          });

          if (moved) {
            canvas.renderAll();
            saveState();
            e.preventDefault();
          }
        }
      } else if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (key === 'y') {
          e.preventDefault();
          redo();
        } else if (key === 'a') {
          // Select all objects (except background and locked ones)
          e.preventDefault();
          const objs = canvas.getObjects().filter(o => !(o as any).isBackgroundImage && !(o as any).locked);
          if (objs.length > 0) {
            canvas.discardActiveObject();
            const sel = new fabric.ActiveSelection(objs, { canvas });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
          }
        } else if (key === 'c' && activeObject) {
          // Copy
          e.preventDefault();
          activeObject.clone((cloned: fabric.Object) => {
            _clipboard = cloned;
          });
        } else if (key === 'v' && _clipboard) {
          // Paste
          e.preventDefault();
          _clipboard.clone((clonedObj: any) => {
            canvas.discardActiveObject();
            clonedObj.set({
              left: clonedObj.left + 15,
              top: clonedObj.top + 15,
              evented: true,
            });
            if (clonedObj.type === 'activeSelection') {
              // active selection needs a reference to the canvas
              clonedObj.canvas = canvas;
              clonedObj.forEachObject((obj: any) => {
                obj.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
                canvas.add(obj);
              });
              clonedObj.setCoords();
            } else {
              clonedObj.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
              canvas.add(clonedObj);
            }
            if (_clipboard) {
              if (_clipboard.top !== undefined) _clipboard.top += 15;
              if (_clipboard.left !== undefined) _clipboard.left += 15;
            }
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            saveState();
          });
        } else if (key === 'd' && activeObject) {
          // Duplicate
          e.preventDefault();
          activeObject.clone((clonedObj: any) => {
            canvas.discardActiveObject();
            clonedObj.set({
              left: clonedObj.left + 15,
              top: clonedObj.top + 15,
              evented: true,
            });
            if (clonedObj.type === 'activeSelection') {
              clonedObj.canvas = canvas;
              clonedObj.forEachObject((obj: any) => {
                obj.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
                canvas.add(obj);
              });
              clonedObj.setCoords();
            } else {
              clonedObj.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
              canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            saveState();
          });
        } else if (key === 'g') {
          e.preventDefault();
          if (!e.shiftKey && activeObject && activeObject.type === 'activeSelection') {
            // Group
            (activeObject as fabric.ActiveSelection).toGroup();
            canvas.requestRenderAll();
            saveState();
          } else if (e.shiftKey && activeObject && activeObject.type === 'group') {
            // Ungroup
            (activeObject as fabric.Group).toActiveSelection();
            canvas.requestRenderAll();
            saveState();
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
