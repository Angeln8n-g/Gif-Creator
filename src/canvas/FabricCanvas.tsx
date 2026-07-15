import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import type { FrameImage, DrawingTool, CanvasLayer } from '../types';
import { 
  generateCanvasLayers, 
  serializeCanvasObjects, 
  serializeTextAndStickers,
  deserializeAllToCanvas 
} from './canvasSerializer';

interface FabricCanvasProps {
  frame: FrameImage;
  onFrameUpdate: (updatedFrame: FrameImage) => void;
  onLayersChange: (layers: CanvasLayer[]) => void;
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  brushWidth: number;
  color: string;
  opacity: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onSelectLayerId: (id: string | null) => void;
  selectedLayerId: string | null;
  onSaveHistory: () => void;
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

export function FabricCanvas({
  frame,
  onFrameUpdate,
  onLayersChange,
  activeTool,
  onToolChange,
  brushWidth,
  color,
  opacity,
  zoom,
  onZoomChange,
  showGrid,
  onSelectLayerId,
  selectedLayerId,
  onSaveHistory,
  canvasRef
}: FabricCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isDrawingShape = useRef(false);
  const shapeStartPoint = useRef<{ x: number; y: number } | null>(null);
  const activeShape = useRef<fabric.Object | null>(null);

  // Responsive scale observer and Spacebar listener
  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const parentWidth = parent.clientWidth;
      const newScale = Math.min(1, (parentWidth - 32) / 960);
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync canvas modification to parent state
  const syncCanvasToState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawings = serializeCanvasObjects(canvas);
    const { text, stickers } = serializeTextAndStickers(canvas);

    onFrameUpdate({
      ...frame,
      drawings,
      text,
      stickers
    });
    onLayersChange(generateCanvasLayers(canvas));
  };

  // Initialize Canvas
  useEffect(() => {
    if (!canvasElRef.current) return;

    // Create Fabric instance
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: 960,
      height: 540,
      backgroundColor: '#0f172a',
      selection: true,
      preserveObjectStacking: true
    });

    canvasRef.current = canvas;

    // Load background image
    fabric.Image.fromURL(frame.previewUrl, (img) => {
      const canvasWidth = 960;
      const canvasHeight = 540;
      const imgWidth = img.width || 1;
      const imgHeight = img.height || 1;
      const scaleX = canvasWidth / imgWidth;
      const scaleY = canvasHeight / imgHeight;
      const scaleToCover = Math.min(scaleX, scaleY);

      img.set({
        scaleX: scaleToCover,
        scaleY: scaleToCover,
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      });
      (img as any).isBackgroundImage = true;
      
      canvas.insertAt(img, 0, false);
      
      // Load existing drawings, texts, and stickers
      deserializeAllToCanvas(frame, canvas, () => {
        canvas.renderAll();
        onLayersChange(generateCanvasLayers(canvas));
      });
    });

    // Object event listeners
    const handleObjectModified = () => {
      onSaveHistory();
      syncCanvasToState();
    };

    const handleObjectAdded = (e: any) => {
      const obj = e.target;
      if (obj && !obj.id) {
        obj.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
      }
      onLayersChange(generateCanvasLayers(canvas));
    };

    const handleSelectionCreated = (e: any) => {
      const activeObj = e.selected?.[0];
      onSelectLayerId(activeObj ? activeObj.id : null);
    };

    const handleSelectionCleared = () => {
      onSelectLayerId(null);
    };

    const handleMouseWheel = (opt: any) => {
      if (opt.e.ctrlKey || opt.e.metaKey) {
        var delta = opt.e.deltaY;
        var newZoom = canvas.getZoom();
        newZoom *= 0.999 ** delta;
        if (newZoom > 3) newZoom = 3;
        if (newZoom < 0.2) newZoom = 0.2;
        
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        
        onZoomChange(newZoom);
      }
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionCreated);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('mouse:wheel', handleMouseWheel);

    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionCreated);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('mouse:wheel', handleMouseWheel);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [frame.id]); // Re-initialize only when frame ID changes

  // Setup Tools & Brushes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activeTool !== 'select') {
      canvas.discardActiveObject();
      canvas.renderAll();
    }

    // Set selectability of elements based on mode
    canvas.getObjects().forEach((obj) => {
      if (!(obj as any).isBackgroundImage) {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select';
      }
    });

    canvas.isDrawingMode = false;
    canvas.selection = activeTool === 'select';

    if (activeTool === 'brush') {
      canvas.isDrawingMode = true;
      const pencil = new fabric.PencilBrush(canvas);
      pencil.color = color;
      pencil.width = brushWidth;
      canvas.freeDrawingBrush = pencil;
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      const eraser = new fabric.PencilBrush(canvas);
      eraser.color = 'rgba(0,0,0,1)';
      eraser.width = brushWidth;
      canvas.freeDrawingBrush = eraser;
    }

    canvas.renderAll();
  }, [activeTool, color, brushWidth]);

  // Handle path creation (for Pencil and Eraser brushes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePathCreated = (e: any) => {
      const pathObj = e.path;
      if (!pathObj) return;

      pathObj.set({
        id: `obj-${Math.random().toString(36).substring(2, 9)}`,
        drawingType: activeTool
      });

      if (activeTool === 'eraser') {
        pathObj.set({
          globalCompositeOperation: 'destination-out',
          opacity: 1
        });
      }

      onSaveHistory();
      syncCanvasToState();
    };

    canvas.on('path:created', handlePathCreated);
    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [activeTool]);

  // Interactive Shape Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (o: any) => {
      if (isSpacePressed) {
        (canvas as any).isDragging = true;
        canvas.selection = false;
        canvas.discardActiveObject();
        (canvas as any).lastPosX = o.e.clientX;
        (canvas as any).lastPosY = o.e.clientY;
        return;
      }

      if (activeTool === 'select' || activeTool === 'brush' || activeTool === 'eraser') return;

      const pointer = canvas.getPointer(o.e);
      isDrawingShape.current = true;
      shapeStartPoint.current = { x: pointer.x, y: pointer.y };

      const commonProps = {
        left: pointer.x,
        top: pointer.y,
        fill: activeTool === 'text' || activeTool === 'line' || activeTool === 'arrow' ? 'transparent' : color,
        stroke: color,
        strokeWidth: brushWidth,
        opacity: opacity,
        id: `obj-${Math.random().toString(36).substring(2, 9)}`,
        drawingType: activeTool,
        selectable: false
      };

      let newShape: fabric.Object | null = null;

      switch (activeTool) {
        case 'rectangle':
          newShape = new fabric.Rect({
            ...commonProps,
            width: 0,
            height: 0
          });
          break;
        case 'circle':
          newShape = new fabric.Circle({
            ...commonProps,
            radius: 0
          } as any);
          break;
        case 'ellipse':
          newShape = new fabric.Ellipse({
            ...commonProps,
            rx: 0,
            ry: 0
          } as any);
          break;
        case 'triangle':
          newShape = new fabric.Triangle({
            ...commonProps,
            width: 0,
            height: 0
          });
          break;
        case 'line':
          newShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            ...commonProps,
            fill: color
          });
          break;
        case 'arrow':
          newShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            ...commonProps,
            fill: color
          });
          break;
        case 'text':
          newShape = new fabric.IText('Haz doble click para editar', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Inter',
            fontSize: 32,
            fill: color,
            opacity: opacity,
            id: 'text-overlay',
            drawingType: 'text',
            originX: 'center',
            originY: 'center',
            shadow: new fabric.Shadow({
              color: 'rgba(0,0,0,0.5)',
              blur: 4,
              offsetX: 2,
              offsetY: 2
            })
          } as any);
          isDrawingShape.current = false;
          canvas.add(newShape);
          canvas.setActiveObject(newShape);
          (newShape as fabric.IText).enterEditing();
          onSaveHistory();
          syncCanvasToState();
          onToolChange('select');
          break;
      }

      if (newShape) {
        activeShape.current = newShape;
        canvas.add(newShape);
      }
    };

    const handleMouseMove = (o: any) => {
      if ((canvas as any).isDragging) {
        const e = o.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - (canvas as any).lastPosX;
          vpt[5] += e.clientY - (canvas as any).lastPosY;
          canvas.requestRenderAll();
          (canvas as any).lastPosX = e.clientX;
          (canvas as any).lastPosY = e.clientY;
        }
        return;
      }

      if (!isDrawingShape.current || !activeShape.current || !shapeStartPoint.current) return;

      const pointer = canvas.getPointer(o.e);
      const startX = shapeStartPoint.current.x;
      const startY = shapeStartPoint.current.y;
      
      const width = pointer.x - startX;
      const height = pointer.y - startY;

      const shape = activeShape.current;

      switch (activeTool) {
        case 'rectangle':
          shape.set({
            left: width > 0 ? startX : pointer.x,
            top: height > 0 ? startY : pointer.y,
            width: Math.abs(width),
            height: Math.abs(height)
          });
          break;
        case 'circle':
          const radius = Math.sqrt(width * width + height * height) / 2;
          (shape as fabric.Circle).set({
            left: pointer.x > startX ? startX : startX - radius * 2,
            top: pointer.y > startY ? startY : startY - radius * 2,
            radius: radius
          });
          break;
        case 'ellipse':
          (shape as fabric.Ellipse).set({
            left: width > 0 ? startX : pointer.x,
            top: height > 0 ? startY : pointer.y,
            rx: Math.abs(width) / 2,
            ry: Math.abs(height) / 2
          });
          break;
        case 'triangle':
          shape.set({
            left: width > 0 ? startX : pointer.x,
            top: height > 0 ? startY : pointer.y,
            width: Math.abs(width),
            height: Math.abs(height)
          });
          break;
        case 'line':
        case 'arrow':
          (shape as fabric.Line).set({
            x2: pointer.x,
            y2: pointer.y
          });
          break;
      }

      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if ((canvas as any).isDragging) {
        canvas.setViewportTransform(canvas.viewportTransform!);
        (canvas as any).isDragging = false;
        canvas.selection = activeTool === 'select';
        return;
      }

      if (!isDrawingShape.current) return;
      isDrawingShape.current = false;

      const canvasInstance = canvasRef.current;
      if (!canvasInstance || !activeShape.current || !shapeStartPoint.current) return;

      if (activeTool === 'arrow' && activeShape.current instanceof fabric.Line) {
        const line = activeShape.current;
        const x1 = line.x1 || 0;
        const y1 = line.y1 || 0;
        const x2 = line.x2 || 0;
        const y2 = line.y2 || 0;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowSize = Math.max(12, brushWidth * 3);

        const arrowHead = new fabric.Triangle({
          left: x2,
          top: y2,
          angle: (angle * 180 / Math.PI) + 90,
          width: arrowSize,
          height: arrowSize,
          fill: color,
          stroke: color,
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          selectable: false
        });

        canvas.remove(line);
        
        const arrowGroup = new fabric.Group([line, arrowHead], {
          id: (line as any).id,
          drawingType: 'arrow',
          stroke: color,
          fill: color,
          selectable: true
        } as any);

        canvas.add(arrowGroup);
      }

      activeShape.current.setCoords();
      canvasInstance.renderAll();

      onSaveHistory();
      syncCanvasToState();

      // Reset
      activeShape.current = null;
      shapeStartPoint.current = null;
      onToolChange('select');
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [activeTool, color, brushWidth, opacity, isSpacePressed]);

  // Apply Selected Layer to Active Object
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!selectedLayerId) {
      canvas.discardActiveObject();
      canvas.renderAll();
      return;
    }

    const obj = canvas.getObjects().find((o) => (o as any).id === selectedLayerId);
    if (obj && canvas.getActiveObject() !== obj) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  }, [selectedLayerId]);

  // Apply Zoom State
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (Math.abs(canvas.getZoom() - zoom) > 0.01) {
      canvas.zoomToPoint({ x: 960 / 2, y: 540 / 2 }, zoom);
      canvas.renderAll();
    }
  }, [zoom]);

  return (
    <div 
      ref={containerRef}
      className="relative border border-dark-border bg-dark-bg rounded-2xl flex items-center justify-center overflow-hidden shadow-inner w-full min-h-[560px]"
    >
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #475569 1px, transparent 1px),
              linear-gradient(to bottom, #475569 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      )}

      <div 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: '960px',
          height: '540px',
          transition: 'transform 0.15s ease-out'
        }}
        className="shadow-2xl shadow-black/50 overflow-hidden rounded-lg shrink-0"
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
