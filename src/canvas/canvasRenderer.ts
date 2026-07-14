import { fabric } from 'fabric';
import type { DrawingObject } from '../types';

/**
 * Renders the drawing objects of a frame onto a Canvas 2D or OffscreenCanvas context.
 * This is used during the export phase in useFFmpeg.ts.
 */
export function renderDrawingsToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  drawings: DrawingObject[] | undefined,
  width: number,
  height: number,
  referenceWidth = 960
): Promise<void> {
  return new Promise((resolve) => {
    if (!drawings || drawings.length === 0) {
      resolve();
      return;
    }

    // Create a temporary HTML canvas in the main thread
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;

    const staticCanvas = new fabric.StaticCanvas(tempCanvas);
    staticCanvas.setDimensions({ width, height });

    // Scale drawings from reference size to target size
    const scale = width / referenceWidth;
    staticCanvas.setZoom(scale);

    // Deserialize objects
    const objectsJSON = drawings.map((d) => JSON.parse(d.fabricJSON));
    fabric.util.enlivenObjects(
      objectsJSON,
      (objects: fabric.Object[]) => {
        objects.forEach((obj) => {
          staticCanvas.add(obj);
        });
        staticCanvas.renderAll();

        // Draw tempCanvas onto target context
        ctx.drawImage(tempCanvas, 0, 0);

        // Clean up
        staticCanvas.dispose();
        resolve();
      },
      'fabric'
    );
  });
}
