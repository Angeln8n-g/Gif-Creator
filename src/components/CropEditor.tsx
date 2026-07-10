import { useState, useRef, useEffect, useCallback } from 'react';
import type { CropSettings, CropShape } from '../types';
import {
  Square, Circle, Triangle, Diamond, Star, Heart,
  Hexagon, Octagon, Pentagon, RotateCcw, Maximize2, Crop, Minus, Pencil, Trash2, Check
} from 'lucide-react';

const DEFAULT_CROP: CropSettings = {
  shape: 'none',
  cornerRadius: 0,
  borderWidth: 0,
  borderColor: '#E11D48',
  padding: 0,
  margin: 0,
  insetTop: 0,
  insetRight: 0,
  insetBottom: 0,
  insetLeft: 0,
};

const shapes: { value: CropShape; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Ninguno', icon: <Maximize2 size={14} /> },
  { value: 'rectangle', label: 'Rectángulo', icon: <Square size={14} /> },
  { value: 'rounded', label: 'Redondeado', icon: <Square size={14} className="rounded" /> },
  { value: 'circle', label: 'Círculo', icon: <Circle size={14} /> },
  { value: 'ellipse', label: 'Elipse', icon: <Circle size={14} className="scale-x-125" /> },
  { value: 'diamond', label: 'Diamante', icon: <Diamond size={14} /> },
  { value: 'hexagon', label: 'Hexágono', icon: <Hexagon size={14} /> },
  { value: 'octagon', label: 'Octágono', icon: <Octagon size={14} /> },
  { value: 'star', label: 'Estrella', icon: <Star size={14} /> },
  { value: 'heart', label: 'Corazón', icon: <Heart size={14} /> },
  { value: 'triangle', label: 'Triángulo', icon: <Triangle size={14} /> },
  { value: 'pentagon', label: 'Pentágono', icon: <Pentagon size={14} /> },
  { value: 'inset', label: 'Recorte', icon: <Crop size={14} /> },
  { value: 'freeform', label: 'Libre', icon: <Pencil size={14} /> },
];

const borderColors = [
  '#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#FFFFFF', '#000000', '#6B7280', '#F97316',
];

interface CropEditorProps {
  crop?: CropSettings;
  onChange: (crop: CropSettings | undefined) => void;
}

export function CropEditor({ crop, onChange }: CropEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!crop && crop.shape !== 'none');
  const current = crop || DEFAULT_CROP;

  // Freeform drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempPoints, setTempPoints] = useState<{ x: number; y: number }[]>(
    current.freeformPoints || []
  );

  // Sync tempPoints when crop changes externally
  useEffect(() => {
    if (crop?.freeformPoints) {
      setTempPoints(crop.freeformPoints);
    }
  }, [crop?.shape]);

  const update = (partial: Partial<CropSettings>) => {
    const next = { ...current, ...partial };
    if (next.shape === 'none' && next.borderWidth === 0 && next.padding === 0 && next.margin === 0) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  const handleReset = () => {
    onChange(undefined);
    setIsExpanded(false);
    setTempPoints([]);
    setIsDrawing(false);
  };

  const handleShapeChange = (shape: CropShape) => {
    if (shape === 'none') {
      handleReset();
      return;
    }
    setIsExpanded(true);
    if (shape === 'freeform') {
      setIsDrawing(true);
      setTempPoints(current.freeformPoints || []);
      update({ shape, freeformPoints: current.freeformPoints || [] });
    } else {
      setIsDrawing(false);
      update({ shape });
    }
  };

  // Draw the freeform preview canvas
  const drawFreeformCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1E1B4B';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const gx = (i / 10) * w;
      const gy = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    if (tempPoints.length === 0) {
      // Instruction text
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Haz clic para agregar puntos', w / 2, h / 2 - 8);
      ctx.fillText('y crear tu forma libre', w / 2, h / 2 + 8);
      return;
    }

    // Draw the polygon fill area (semi-transparent)
    if (tempPoints.length >= 3 && !isDrawing) {
      ctx.beginPath();
      tempPoints.forEach((pt, i) => {
        const px = (pt.x / 100) * w;
        const py = (pt.y / 100) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fill();
    }

    // Draw lines between points
    ctx.beginPath();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    tempPoints.forEach((pt, i) => {
      const px = (pt.x / 100) * w;
      const py = (pt.y / 100) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    if (!isDrawing && tempPoints.length >= 3) {
      ctx.closePath();
    }
    ctx.stroke();

    // If drawing and have 3+ points, show dashed line from last to first
    if (isDrawing && tempPoints.length >= 3) {
      const first = tempPoints[0];
      const last = tempPoints[tempPoints.length - 1];
      ctx.beginPath();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo((last.x / 100) * w, (last.y / 100) * h);
      ctx.lineTo((first.x / 100) * w, (first.y / 100) * h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    tempPoints.forEach((pt, i) => {
      const px = (pt.x / 100) * w;
      const py = (pt.y / 100) * h;

      // Outer ring
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#10B981' : '#3B82F6';
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Point number
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${i + 1}`, px, py - 9);
    });

    // First point close indicator when drawing
    if (isDrawing && tempPoints.length >= 3) {
      const first = tempPoints[0];
      const px = (first.x / 100) * w;
      const py = (first.y / 100) * h;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [tempPoints, isDrawing]);

  useEffect(() => {
    if (current.shape === 'freeform') {
      drawFreeformCanvas();
    }
  }, [current.shape, drawFreeformCanvas]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Percentage coords
    const px = (clickX / canvas.width) * 100;
    const py = (clickY / canvas.height) * 100;

    // Check if clicking near first point to close the shape
    if (tempPoints.length >= 3) {
      const first = tempPoints[0];
      const firstPx = (first.x / 100) * canvas.width;
      const firstPy = (first.y / 100) * canvas.height;
      const dist = Math.hypot(clickX - firstPx, clickY - firstPy);
      if (dist < 15) {
        // Close shape
        setIsDrawing(false);
        update({ shape: 'freeform', freeformPoints: tempPoints });
        return;
      }
    }

    const newPoints = [...tempPoints, { x: px, y: py }];
    setTempPoints(newPoints);
    update({ shape: 'freeform', freeformPoints: newPoints });
  };

  const handleConfirmFreeform = () => {
    if (tempPoints.length >= 3) {
      setIsDrawing(false);
      update({ shape: 'freeform', freeformPoints: tempPoints });
    }
  };

  const handleClearPoints = () => {
    setTempPoints([]);
    setIsDrawing(true);
    update({ shape: 'freeform', freeformPoints: [] });
  };

  const handleUndoLastPoint = () => {
    if (tempPoints.length === 0) return;
    const newPoints = tempPoints.slice(0, -1);
    setTempPoints(newPoints);
    update({ shape: 'freeform', freeformPoints: newPoints });
  };

  const showCornerRadius = ['rectangle', 'rounded', 'inset'].includes(current.shape);
  const showInsets = current.shape === 'inset' || current.shape === 'rectangle';
  const showFreeform = current.shape === 'freeform';

  return (
    <div className="space-y-3">
      {/* Shape Grid */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Forma de Recorte</label>
        <div className="grid grid-cols-4 gap-1">
          {shapes.map((s) => (
            <button
              key={s.value}
              onClick={() => handleShapeChange(s.value)}
              title={s.label}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] leading-tight transition-all duration-200 cursor-pointer
                ${current.shape === s.value
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                  : 'bg-dark-bg border border-dark-border text-gray-500 hover:text-gray-300 hover:border-gray-500'
                }`}
            >
              {s.icon}
              <span className="mt-0.5 truncate w-full text-center">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded controls */}
      {isExpanded && current.shape !== 'none' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-dark-bg/50 p-3 rounded-xl border border-dark-border/50">

          {/* Freeform Drawing Canvas */}
          {showFreeform && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                  <Pencil size={12} className="text-emerald-400" />
                  Dibujo Libre
                </label>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {tempPoints.length} puntos
                </span>
              </div>

              {/* Canvas */}
              <div className="relative rounded-lg overflow-hidden border border-dark-border/50 group">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={180}
                  onClick={handleCanvasClick}
                  className={`w-full cursor-crosshair transition-shadow ${
                    isDrawing
                      ? 'ring-2 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : ''
                  }`}
                />
                {isDrawing && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-emerald-400 font-medium">Dibujando</span>
                  </div>
                )}
              </div>

              {/* Freeform action buttons */}
              <div className="flex gap-1.5">
                {isDrawing && tempPoints.length >= 3 && (
                  <button
                    onClick={handleConfirmFreeform}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer"
                  >
                    <Check size={11} />
                    Cerrar Forma
                  </button>
                )}
                {tempPoints.length > 0 && (
                  <button
                    onClick={handleUndoLastPoint}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    Deshacer
                  </button>
                )}
                {tempPoints.length > 0 && (
                  <button
                    onClick={handleClearPoints}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 size={11} />
                    Limpiar
                  </button>
                )}
                {!isDrawing && tempPoints.length >= 3 && (
                  <button
                    onClick={() => setIsDrawing(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer"
                  >
                    <Pencil size={11} />
                    Editar
                  </button>
                )}
              </div>

              {isDrawing && tempPoints.length < 3 && (
                <p className="text-[10px] text-gray-500 text-center">
                  Necesitas al menos 3 puntos para crear una forma
                </p>
              )}
              {isDrawing && tempPoints.length >= 3 && (
                <p className="text-[10px] text-gray-500 text-center">
                  Haz clic en el punto <span className="text-emerald-400">1</span> para cerrar, o usa el botón "Cerrar Forma"
                </p>
              )}
            </div>
          )}

          {/* Corner Radius */}
          {showCornerRadius && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-gray-300">Esquinas (Border Radius)</label>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {current.cornerRadius}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={current.cornerRadius}
                onChange={(e) => update({ cornerRadius: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}

          {/* Border Width */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-gray-300">Grosor del Borde</label>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {current.borderWidth}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={current.borderWidth}
              onChange={(e) => update({ borderWidth: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Border Color */}
          {current.borderWidth > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-300 mb-1.5 block">Color del Borde</label>
              <div className="flex gap-1.5 flex-wrap">
                {borderColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ borderColor: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer hover:scale-110 ${
                      current.borderColor === c
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-dark-border'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <label className="w-6 h-6 rounded-full border-2 border-dark-border cursor-pointer overflow-hidden relative hover:scale-110 transition-transform" title="Color personalizado">
                  <input
                    type="color"
                    value={current.borderColor}
                    onChange={(e) => update({ borderColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full"
                    style={{
                      background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Padding */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-gray-300">Padding (interno)</label>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {current.padding}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={current.padding}
              onChange={(e) => update({ padding: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Margin */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-gray-300">Margin (externo)</label>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                {current.margin}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={current.margin}
              onChange={(e) => update({ margin: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Inset Controls (per-side crop) */}
          {showInsets && (
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 block">Recorte por Borde (Inset)</label>
              <div className="grid grid-cols-2 gap-2">
                {/* Top */}
                <div className="flex items-center gap-2">
                  <Minus size={12} className="text-gray-400 rotate-0 shrink-0" />
                  <span className="text-[10px] text-gray-400 w-10 shrink-0">Arriba</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={current.insetTop}
                    onChange={(e) => update({ insetTop: parseInt(e.target.value) })}
                    className="flex-1 h-1 bg-dark-border rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[10px] font-mono text-amber-400 w-7 text-right">{current.insetTop}%</span>
                </div>
                {/* Bottom */}
                <div className="flex items-center gap-2">
                  <Minus size={12} className="text-gray-400 rotate-0 shrink-0" />
                  <span className="text-[10px] text-gray-400 w-10 shrink-0">Abajo</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={current.insetBottom}
                    onChange={(e) => update({ insetBottom: parseInt(e.target.value) })}
                    className="flex-1 h-1 bg-dark-border rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[10px] font-mono text-amber-400 w-7 text-right">{current.insetBottom}%</span>
                </div>
                {/* Left */}
                <div className="flex items-center gap-2">
                  <Minus size={12} className="text-gray-400 rotate-90 shrink-0" />
                  <span className="text-[10px] text-gray-400 w-10 shrink-0">Izq.</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={current.insetLeft}
                    onChange={(e) => update({ insetLeft: parseInt(e.target.value) })}
                    className="flex-1 h-1 bg-dark-border rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[10px] font-mono text-amber-400 w-7 text-right">{current.insetLeft}%</span>
                </div>
                {/* Right */}
                <div className="flex items-center gap-2">
                  <Minus size={12} className="text-gray-400 rotate-90 shrink-0" />
                  <span className="text-[10px] text-gray-400 w-10 shrink-0">Der.</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={current.insetRight}
                    onChange={(e) => update({ insetRight: parseInt(e.target.value) })}
                    className="flex-1 h-1 bg-dark-border rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[10px] font-mono text-amber-400 w-7 text-right">{current.insetRight}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-red-400 py-2 rounded-lg border border-dark-border hover:border-red-500/30 transition-all cursor-pointer"
          >
            <RotateCcw size={12} />
            Restablecer Recorte
          </button>
        </div>
      )}
    </div>
  );
}
