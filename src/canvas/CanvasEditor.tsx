import { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import type { FrameImage, DrawingTool, CanvasLayer } from '../types';
import { CanvasToolbar } from './CanvasToolbar';
import { FabricCanvas } from './FabricCanvas';
import { LayerPanel } from './LayerPanel';
import { useCanvasHistory } from './useCanvasHistory';
import { useCanvasKeyboard } from './useCanvasKeyboard';
import { generateCanvasLayers, serializeCanvasObjects } from './canvasSerializer';
import { Play } from 'lucide-react';

interface CanvasEditorProps {
  frame: FrameImage;
  onFrameUpdate: (updatedFrame: FrameImage) => void;
  onClose: () => void;
}

export function CanvasEditor({
  frame,
  onFrameUpdate,
  onClose
}: CanvasEditorProps) {
  const canvasRef = useRef<fabric.Canvas | null>(null);

  // States for toolbar and editor options
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [brushWidth, setBrushWidth] = useState<number>(5);
  const [color, setColor] = useState<string>('#e11d48');
  const [opacity, setOpacity] = useState<number>(1.0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // Layer list states
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Canvas History custom hook
  const { 
    saveState: saveCanvasState, 
    initHistory, 
    undo: triggerUndo, 
    redo: triggerRedo, 
    canUndo, 
    canRedo 
  } = useCanvasHistory();

  // Initialize history when the frame changes
  useEffect(() => {
    initHistory(frame.drawings || []);
  }, [frame.id]);

  // Hook for keyboard listener
  const handleSaveToState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveCanvasState(canvas);
  };

  useCanvasKeyboard({
    canvas: canvasRef.current,
    undo: () => {
      const canvas = canvasRef.current;
      if (canvas) triggerUndo(canvas, (drawings) => {
        onFrameUpdate({ ...frame, drawings });
      });
    },
    redo: () => {
      const canvas = canvasRef.current;
      if (canvas) triggerRedo(canvas, (drawings) => {
        onFrameUpdate({ ...frame, drawings });
      });
    },
    saveState: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        onFrameUpdate({ ...frame, drawings: serializeCanvasObjects(canvas) });
      }
    }
  });

  // Layer Actions
  const handleToggleVisibility = (id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      obj.visible = !obj.visible;
      canvas.renderAll();
      setLayers(generateCanvasLayers(canvas));
      onFrameUpdate({ ...frame, drawings: serializeCanvasObjects(canvas) });
    }
  };

  const handleToggleLock = (id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      const isLocked = !(obj as any).locked;
      (obj as any).locked = isLocked;
      
      // Toggle all control handles
      obj.lockMovementX = isLocked;
      obj.lockMovementY = isLocked;
      obj.lockScalingX = isLocked;
      obj.lockScalingY = isLocked;
      obj.lockRotation = isLocked;
      obj.hasControls = !isLocked;
      
      canvas.discardActiveObject();
      canvas.renderAll();
      setLayers(generateCanvasLayers(canvas));
      onFrameUpdate({ ...frame, drawings: serializeCanvasObjects(canvas) });
    }
  };

  const handleOpacityChange = (id: string, newOpacity: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      obj.set({ opacity: newOpacity });
      canvas.renderAll();
      setLayers(generateCanvasLayers(canvas));
      onFrameUpdate({ ...frame, drawings: serializeCanvasObjects(canvas) });
    }
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      const objects = canvas.getObjects();
      const currIdx = objects.indexOf(obj);
      
      // Base frame image is at index 0, we can't move drawings below index 1
      let newIdx = currIdx + (direction === 'up' ? 1 : -1);
      
      if (newIdx >= 1 && newIdx < objects.length) {
        obj.moveTo(newIdx);
        canvas.renderAll();
        setLayers(generateCanvasLayers(canvas));
        onFrameUpdate({ ...frame, drawings: serializeCanvasObjects(canvas) });
      }
    }
  };

  const handleDeleteLayer = (id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).id === id);
    if (obj && !(obj as any).isBackgroundImage) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedLayerId(null);
      setLayers(generateCanvasLayers(canvas));
      onFrameUpdate({ ...frame, drawings: serializeCanvasObjects(canvas) });
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full h-full min-h-[640px] animate-in fade-in duration-300">
      
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between bg-dark-card border border-dark-border px-6 py-3 rounded-2xl">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🎨</span>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Modo de Edición Canvas</h3>
            <p className="text-xs text-gray-500 font-semibold">Diseña y dibuja sobre el fotograma seleccionado</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Back to player button */}
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold rounded-xl shadow-lg shadow-cta/20 transition-all cursor-pointer"
          >
            <Play size={14} />
            <span>Volver a Reproducción</span>
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        brushWidth={brushWidth}
        onBrushWidthChange={setBrushWidth}
        color={color}
        onColorChange={setColor}
        opacity={opacity}
        onOpacityChange={setOpacity}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onGridToggle={() => setShowGrid(!showGrid)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          const canvas = canvasRef.current;
          if (canvas) triggerUndo(canvas, (drawings) => {
            onFrameUpdate({ ...frame, drawings });
          });
        }}
        onRedo={() => {
          const canvas = canvasRef.current;
          if (canvas) triggerRedo(canvas, (drawings) => {
            onFrameUpdate({ ...frame, drawings });
          });
        }}
      />

      {/* Editor Workspace & Sidebar Layout */}
      <div className="flex gap-4 items-stretch flex-1 min-h-[500px]">
        
        {/* Canvas editor workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <FabricCanvas
            frame={frame}
            onFrameUpdate={onFrameUpdate}
            onLayersChange={setLayers}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            brushWidth={brushWidth}
            color={color}
            opacity={opacity}
            zoom={zoom}
            onZoomChange={setZoom}
            showGrid={showGrid}
            selectedLayerId={selectedLayerId}
            onSelectLayerId={setSelectedLayerId}
            onSaveHistory={handleSaveToState}
            canvasRef={canvasRef}
          />
        </div>

        {/* Sidebar layers panel */}
        <div className="shrink-0">
          <LayerPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onOpacityChange={handleOpacityChange}
            onMoveLayer={handleMoveLayer}
            onDeleteLayer={handleDeleteLayer}
          />
        </div>
      </div>
    </div>
  );
}
