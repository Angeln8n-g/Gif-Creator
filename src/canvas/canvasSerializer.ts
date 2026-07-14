import { fabric } from 'fabric';
import type { DrawingObject, DrawingTool, CanvasLayer, FrameImage, TextOverlay, StickerOverlay } from '../types';

// Custom properties we want Fabric.js to serialize for drawings/shapes
export const CUSTOM_FABRIC_PROPS = [
  'id',
  'drawingType',
  'name',
  'selectable',
  'hasControls',
  'hasBorders',
  'lockMovementX',
  'lockMovementY',
  'visible',
  'opacity',
  'locked'
];

/**
 * Serializes all drawing objects on the canvas (excluding text overlays and stickers)
 */
export function serializeCanvasObjects(canvas: fabric.Canvas): DrawingObject[] {
  const drawings: DrawingObject[] = [];

  canvas.getObjects().forEach((obj) => {
    const drawingType = (obj as any).drawingType as DrawingTool | undefined;
    
    // We only save lines, shapes and freehand drawings to the drawings array.
    // Text overlays and stickers are mapped separately.
    if (
      drawingType && 
      drawingType !== 'select' && 
      drawingType !== 'text' && 
      drawingType !== 'sticker'
    ) {
      const serialized = obj.toObject(CUSTOM_FABRIC_PROPS);
      drawings.push({
        id: (obj as any).id || Math.random().toString(36).substring(2, 9),
        type: drawingType,
        fabricJSON: JSON.stringify(serialized)
      });
    }
  });

  return drawings;
}

/**
 * Deserializes drawing objects and adds them to a Fabric canvas.
 * This is used for history management (undo/redo).
 */
export function deserializeObjectsToCanvas(
  drawings: DrawingObject[],
  canvas: fabric.Canvas,
  callback?: () => void
): void {
  if (!drawings || drawings.length === 0) {
    if (callback) callback();
    return;
  }

  const objectsJSON = drawings.map((d) => JSON.parse(d.fabricJSON));

  fabric.util.enlivenObjects(
    objectsJSON,
    (enlivenObjects: fabric.Object[]) => {
      enlivenObjects.forEach((obj, idx) => {
        const original = drawings[idx];
        (obj as any).id = original.id;
        (obj as any).drawingType = original.type;
        
        if ((obj as any).locked) {
          obj.lockMovementX = true;
          obj.lockMovementY = true;
          obj.lockScalingX = true;
          obj.lockScalingY = true;
          obj.lockRotation = true;
          obj.hasControls = false;
        }

        canvas.add(obj);
      });
      canvas.renderAll();
      if (callback) callback();
    },
    'fabric'
  );
}

/**
 * Deserializes drawings, text overlay, and stickers, and adds them to a Fabric canvas.
 */
export function deserializeAllToCanvas(
  frame: FrameImage,
  canvas: fabric.Canvas,
  callback?: () => void
): void {
  // 1. First load normal drawings/shapes
  const drawings = frame.drawings || [];
  const objectsJSON = drawings.map((d) => JSON.parse(d.fabricJSON));

  fabric.util.enlivenObjects(
    objectsJSON,
    (enlivenObjects: fabric.Object[]) => {
      enlivenObjects.forEach((obj, idx) => {
        const original = drawings[idx];
        (obj as any).id = original.id;
        (obj as any).drawingType = original.type;
        
        if ((obj as any).locked) {
          obj.lockMovementX = true;
          obj.lockMovementY = true;
          obj.lockScalingX = true;
          obj.lockScalingY = true;
          obj.lockRotation = true;
          obj.hasControls = false;
        }

        canvas.add(obj);
      });

      // 2. Load text overlay
      if (frame.text && frame.text.content && frame.text.content.trim()) {
        const t = frame.text;
        const txtObj = new fabric.IText(t.content, {
          id: 'text-overlay',
          drawingType: 'text',
          left: (t.x / 100) * 960,
          top: (t.y / 100) * 540,
          fontSize: t.fontSize,
          fontFamily: t.fontFamily || 'Inter',
          fill: t.color || '#ffffff',
          stroke: t.outlineColor || '',
          strokeWidth: t.outlineWidth || 0,
          backgroundColor: t.backgroundColor || '',
          angle: t.rotation || 0,
          textAlign: t.align || 'center',
          name: 'Texto Overlay',
          originX: 'center',
          originY: 'center',
          shadow: new fabric.Shadow({
            color: t.shadowColor || 'rgba(0,0,0,0.5)',
            blur: 4,
            offsetX: 2,
            offsetY: 2
          })
        } as any);
        (txtObj as any).animation = t.animation;
        (txtObj as any).cameraMovement = t.cameraMovement;
        (txtObj as any).transition = t.transition;
        
        canvas.add(txtObj);
      }

      // 3. Load stickers
      const stickers = frame.stickers || [];
      let pendingStickersCount = stickers.length;

      if (pendingStickersCount === 0) {
        canvas.renderAll();
        if (callback) callback();
        return;
      }

      stickers.forEach((s) => {
        if (s.type === 'emoji' || !s.type) {
          const emojiObj = new fabric.Text(s.emoji, {
            id: s.id,
            drawingType: 'sticker',
            left: (s.x / 100) * 960,
            top: (s.y / 100) * 540,
            fontSize: s.size,
            angle: s.rotation || 0,
            originX: 'center',
            originY: 'center',
            name: `Sticker ${s.emoji}`
          } as any);
          (emojiObj as any).animation = s.animation;
          (emojiObj as any).cameraMovement = s.cameraMovement;
          (emojiObj as any).transition = s.transition;
          canvas.add(emojiObj);
          
          pendingStickersCount--;
          if (pendingStickersCount === 0) {
            canvas.renderAll();
            if (callback) callback();
          }
        } else if (s.type === 'custom' && s.url) {
          fabric.Image.fromURL(s.url, (img) => {
            img.set({
              id: s.id,
              drawingType: 'sticker',
              left: (s.x / 100) * 960,
              top: (s.y / 100) * 540,
              angle: s.rotation || 0,
              originX: 'center',
              originY: 'center',
              name: 'Sticker Imagen'
            } as any);
            
            const maxDim = Math.max(img.width || 1, img.height || 1);
            const scale = s.size / maxDim;
            img.set({ scaleX: scale, scaleY: scale });
            (img as any).url = s.url;
            (img as any).animation = s.animation;
            (img as any).cameraMovement = s.cameraMovement;
            (img as any).transition = s.transition;
            
            canvas.add(img);
            
            pendingStickersCount--;
            if (pendingStickersCount === 0) {
              canvas.renderAll();
              if (callback) callback();
            }
          });
        }
      });
    },
    'fabric'
  );
}

/**
 * Extracts and maps the TextOverlay and StickerOverlays from the canvas objects.
 */
export function serializeTextAndStickers(canvas: fabric.Canvas): {
  text: TextOverlay | undefined;
  stickers: StickerOverlay[];
} {
  let text: TextOverlay | undefined = undefined;
  const stickers: StickerOverlay[] = [];

  canvas.getObjects().forEach((obj) => {
    const drawingType = (obj as any).drawingType;
    
    if (drawingType === 'text') {
      const txtObj = obj as fabric.IText;
      text = {
        content: txtObj.text || '',
        x: ((txtObj.left || 0) / 960) * 100,
        y: ((txtObj.top || 0) / 540) * 100,
        fontSize: txtObj.fontSize || 24,
        fontFamily: txtObj.fontFamily || 'Inter',
        color: txtObj.fill as string || '#ffffff',
        shadowColor: txtObj.shadow ? (txtObj.shadow as fabric.Shadow).color || 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.5)',
        animation: (txtObj as any).animation || 'none',
        rotation: txtObj.angle || 0,
        cameraMovement: (txtObj as any).cameraMovement || 'none',
        transition: (txtObj as any).transition || 'none',
        outlineColor: txtObj.stroke || '',
        outlineWidth: txtObj.strokeWidth || 0,
        backgroundColor: txtObj.backgroundColor || '',
        align: txtObj.textAlign as 'left' | 'center' | 'right' || 'center'
      };
    } else if (drawingType === 'sticker') {
      const isEmoji = obj instanceof fabric.Text;
      stickers.push({
        id: (obj as any).id || `sticker-${Math.random().toString(36).substring(2, 9)}`,
        emoji: isEmoji ? (obj as fabric.Text).text || '' : '',
        x: ((obj.left || 0) / 960) * 100,
        y: ((obj.top || 0) / 540) * 100,
        size: isEmoji ? (obj as fabric.Text).fontSize || 48 : (obj.width || 48) * (obj.scaleX || 1),
        rotation: obj.angle || 0,
        type: isEmoji ? 'emoji' : 'custom',
        url: (obj as any).url || '',
        animation: (obj as any).animation || 'none',
        cameraMovement: (obj as any).cameraMovement || 'none',
        transition: (obj as any).transition || 'none'
      });
    }
  });

  return { text, stickers };
}

/**
 * Generates the CanvasLayers array based on the Fabric canvas objects.
 */
export function generateCanvasLayers(canvas: fabric.Canvas): CanvasLayer[] {
  const layers: CanvasLayer[] = [];
  const objects = canvas.getObjects();

  objects.forEach((obj, index) => {
    if ((obj as any).isBackgroundImage) return;

    const id = (obj as any).id || `layer-${index}`;
    const type = (obj as any).drawingType || 'drawing';
    const name = obj.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;

    layers.push({
      id,
      name,
      type: mapDrawingTypeToLayerType(type),
      visible: obj.visible !== false,
      locked: (obj as any).locked || false,
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      zIndex: index,
      objectId: id
    });
  });

  return layers.reverse();
}

function mapDrawingTypeToLayerType(tool: DrawingTool): 'image' | 'text' | 'sticker' | 'drawing' | 'shape' {
  switch (tool) {
    case 'text':
      return 'text';
    case 'brush':
    case 'eraser':
      return 'drawing';
    case 'line':
    case 'arrow':
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'triangle':
      return 'shape';
    default:
      return 'drawing';
  }
}
