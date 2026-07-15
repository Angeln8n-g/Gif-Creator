import { 
  MousePointer, 
  Brush, 
  Eraser, 
  Minus, 
  ArrowUpRight, 
  Square, 
  Circle, 
  Triangle, 
  Type, 
  Undo2, 
  Redo2, 
  Grid, 
  ZoomIn, 
  ZoomOut, 
  Trash2,
  ImagePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Maximize2
} from 'lucide-react';
import type { DrawingTool } from '../types';
import { ColorPickerPopover } from './ColorPickerPopover';

interface CanvasToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  brushWidth: number;
  onBrushWidthChange: (w: number) => void;
  color: string;
  onColorChange: (color: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onGridToggle: () => void;
  onClearCanvas: () => void;
  onUploadImage: () => void;
  hasSelection?: boolean;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onLayerOrder?: (action: 'front' | 'back' | 'forward' | 'backward') => void;
}

export function CanvasToolbar({
  activeTool,
  onToolChange,
  brushWidth,
  onBrushWidthChange,
  color,
  onColorChange,
  opacity,
  onOpacityChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomChange,
  showGrid,
  onGridToggle,
  onClearCanvas,
  onUploadImage,
  hasSelection,
  onAlign,
  onLayerOrder
}: CanvasToolbarProps) {
  const tools: { id: DrawingTool; label: string; icon: any; shortcut: string }[] = [
    { id: 'select', label: 'Seleccionar (V)', icon: MousePointer, shortcut: 'V' },
    { id: 'brush', label: 'Pincel (B)', icon: Brush, shortcut: 'B' },
    { id: 'eraser', label: 'Borrador (E)', icon: Eraser, shortcut: 'E' },
    { id: 'line', label: 'Línea (L)', icon: Minus, shortcut: 'L' },
    { id: 'arrow', label: 'Flecha', icon: ArrowUpRight, shortcut: 'A' },
    { id: 'rectangle', label: 'Rectángulo (R)', icon: Square, shortcut: 'R' },
    { id: 'circle', label: 'Círculo (O)', icon: Circle, shortcut: 'O' },
    { id: 'triangle', label: 'Triángulo', icon: Triangle, shortcut: 'T' },
    { id: 'text', label: 'Texto (T)', icon: Type, shortcut: 'T' }
  ];

  return (
    <div className="w-full bg-dark-card border border-dark-border px-4 py-2.5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-lg shadow-black/20">
      {/* Tool Selector Group */}
      <div className="flex items-center space-x-1 bg-dark-bg p-1 rounded-xl border border-dark-border/40">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onToolChange(t.id)}
              className={`p-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isActive 
                  ? 'bg-cta text-light shadow-md shadow-cta/15 font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-card'
              }`}
              title={t.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      {/* Formatting & Brush Options */}
      <div className="flex items-center space-x-4">
        {/* Color Popover */}
        <ColorPickerPopover
          color={color}
          onChange={onColorChange}
          opacity={opacity}
          onOpacityChange={onOpacityChange}
        />

        {/* Brush size slider (for Brush & Eraser & Borders) */}
        {['brush', 'eraser', 'line', 'arrow', 'rectangle', 'circle', 'triangle'].includes(activeTool) && (
          <div className="flex items-center space-x-2 bg-dark-bg border border-dark-border px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Grosor</span>
            <input
              type="range"
              min="1"
              max="50"
              value={brushWidth}
              onChange={(e) => onBrushWidthChange(parseInt(e.target.value))}
              className="w-20 h-1 bg-dark-card rounded-lg appearance-none cursor-pointer accent-cta"
            />
            <span className="text-xs text-white font-semibold font-mono w-5 text-right">{brushWidth}</span>
          </div>
        )}
      </div>

      {/* Grid & Zoom & Undo/Redo */}
      <div className="flex items-center space-x-4">
        {/* Grid Toggle */}
        <button
          onClick={onGridToggle}
          className={`p-2 rounded-xl border cursor-pointer transition-all ${
            showGrid 
              ? 'bg-cta/15 text-cta border-cta/30 shadow-sm shadow-cta/5' 
              : 'bg-dark-bg text-gray-400 border-dark-border hover:text-white hover:bg-dark-card'
          }`}
          title="Alternar cuadrícula"
        >
          <Grid size={18} />
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1.5 bg-dark-bg border border-dark-border px-2 py-1 rounded-xl">
          <button
            onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer"
            title="Reducir Zoom"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono text-white font-semibold w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => onZoomChange(1.0)}
            className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-dark-card cursor-pointer"
            title="Ajustar al 100%"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* History Group */}
        <div className="flex items-center space-x-1 bg-dark-bg p-1 rounded-xl border border-dark-border/40">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <div className="w-[1px] h-4 bg-dark-border" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Actions Group */}
        <div className="flex items-center space-x-1 bg-dark-bg p-1 rounded-xl border border-dark-border/40">
          <button
            onClick={onUploadImage}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer"
            title="Subir Imagen / Sticker"
          >
            <ImagePlus size={16} />
          </button>
          <div className="w-[1px] h-4 bg-dark-border" />
          <button
            onClick={onClearCanvas}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
            title="Limpiar Todo"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Contextual Toolbar (Selection Actions) */}
      {hasSelection && onAlign && onLayerOrder && (
        <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-dark-border/50 animate-in fade-in duration-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mr-2">Alinear</span>
              <button onClick={() => onAlign('left')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Alinear a la Izquierda"><AlignLeft size={16} /></button>
              <button onClick={() => onAlign('center')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Centrar Horizontalmente"><AlignCenter size={16} /></button>
              <button onClick={() => onAlign('right')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Alinear a la Derecha"><AlignRight size={16} /></button>
              <div className="w-[1px] h-4 bg-dark-border mx-1" />
              <button onClick={() => onAlign('top')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Alinear Arriba"><AlignStartVertical size={16} /></button>
              <button onClick={() => onAlign('middle')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Centrar Verticalmente"><AlignCenterVertical size={16} /></button>
              <button onClick={() => onAlign('bottom')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Alinear Abajo"><AlignEndVertical size={16} /></button>
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mr-2">Orden</span>
              <button onClick={() => onLayerOrder('front')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Traer al Frente"><BringToFront size={16} /></button>
              <button onClick={() => onLayerOrder('forward')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Traer un Nivel Adelante"><ArrowUp size={16} /></button>
              <button onClick={() => onLayerOrder('backward')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Enviar un Nivel Atrás"><ArrowDown size={16} /></button>
              <button onClick={() => onLayerOrder('back')} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-card cursor-pointer" title="Enviar al Fondo"><SendToBack size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
