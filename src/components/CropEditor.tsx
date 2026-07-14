import { useState, useRef, useEffect, useCallback } from 'react';
import type { FrameImage, CropSettings, CropShape } from '../types';
import {
  Square, Circle, Triangle, Diamond, Star, Heart,
  Hexagon, Octagon, Pentagon, RotateCcw, Crop, Check,
  ZoomIn, ZoomOut, Move
} from 'lucide-react';

const DEFAULT_CROP: CropSettings = {
  shape: 'inset',
  cornerRadius: 0,
  borderWidth: 0,
  borderColor: '#10B981',
  padding: 0,
  margin: 0,
  insetTop: 0,
  insetRight: 0,
  insetBottom: 0,
  insetLeft: 0,
  rotation: 0,
};

const shapes: { value: CropShape; label: string; icon: React.ReactNode }[] = [
  { value: 'inset', label: 'Recorte', icon: <Crop size={14} /> },
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
];

const borderColors = [
  '#10B981', '#3B82F6', '#F59E0B', '#E11D48', '#8B5CF6',
  '#EC4899', '#FFFFFF', '#000000', '#6B7280', '#F97316',
];

interface CropEditorProps {
  frame: FrameImage;
  crop?: CropSettings;
  onChange: (crop: CropSettings | undefined) => void;
  onClose: () => void;
}

interface DragState {
  type: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'move';
  startX: number;
  startY: number;
  startInsetLeft: number;
  startInsetRight: number;
  startInsetTop: number;
  startInsetBottom: number;
}

export function CropEditor({ frame, crop, onChange, onClose }: CropEditorProps) {
  const initialCropRef = useRef<CropSettings | undefined>(crop);
  const current = crop || DEFAULT_CROP;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState<HTMLImageElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeRatio, setActiveRatio] = useState<string>('libre');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showStylePanel, setShowStylePanel] = useState<boolean>(false);

  // Load preview image
  useEffect(() => {
    if (frame.previewUrl) {
      const img = new Image();
      img.src = frame.previewUrl;
      img.onload = () => {
        setImgLoaded(img);
      };
    }
  }, [frame.previewUrl]);

  const update = (partial: Partial<CropSettings>) => {
    const next = { ...current, ...partial };
    onChange(next);
  };

  const handleReset = () => {
    update({
      insetLeft: 0,
      insetRight: 0,
      insetTop: 0,
      insetBottom: 0,
      rotation: 0,
      cornerRadius: 0,
      borderWidth: 0,
      shape: 'inset',
    });
    setActiveRatio('libre');
    setZoomScale(1);
  };

  const handleCancel = () => {
    onChange(initialCropRef.current);
    onClose();
  };

  const applyAspectRatioPreset = (ratioName: string, ratioValue: number | null) => {
    setActiveRatio(ratioName);
    if (!imgLoaded || ratioValue === null) return;

    const imgW = imgLoaded.width;
    const imgH = imgLoaded.height;
    const imgRatio = imgW / imgH;

    let targetLeft = 0;
    let targetRight = 0;
    let targetTop = 0;
    let targetBottom = 0;

    if (imgRatio > ratioValue) {
      // Wider than target ratio: crop sides
      const targetW = imgH * ratioValue;
      const cropW = imgW - targetW;
      targetLeft = (cropW / 2 / imgW) * 100;
      targetRight = targetLeft;
    } else {
      // Taller than target ratio: crop top/bottom
      const targetH = imgW / ratioValue;
      const cropH = imgH - targetH;
      targetTop = (cropH / 2 / imgH) * 100;
      targetBottom = targetTop;
    }

    update({
      insetLeft: Math.round(targetLeft * 10) / 10,
      insetRight: Math.round(targetRight * 10) / 10,
      insetTop: Math.round(targetTop * 10) / 10,
      insetBottom: Math.round(targetBottom * 10) / 10,
    });
  };

  const drawCropCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear and draw editor viewport background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a'; // slate-900 background
    ctx.fillRect(0, 0, w, h);

    // Compute layout fits
    const padding = 40;
    const maxW = w - padding * 2;
    const maxH = h - padding * 2;
    const baseScale = Math.min(maxW / imgLoaded.width, maxH / imgLoaded.height);
    const scale = baseScale * zoomScale;
    const imgW = imgLoaded.width * scale;
    const imgH = imgLoaded.height * scale;
    const imgX = (w - imgW) / 2;
    const imgY = (h - imgH) / 2;

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const gx = (i / 10) * w;
      const gy = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // Save context for rotated drawing
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (current.rotation) {
      ctx.rotate((current.rotation * Math.PI) / 180);
    }
    ctx.translate(-w / 2, -h / 2);

    // Draw full image
    ctx.drawImage(imgLoaded, imgX, imgY, imgW, imgH);

    // Draw semi-transparent dark overlay to dim the outside
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(imgX, imgY, imgW, imgH);

    // Calculate crop box coordinates
    const x1 = imgX + (current.insetLeft / 100) * imgW;
    const x2 = imgX + imgW - (current.insetRight / 100) * imgW;
    const y1 = imgY + (current.insetTop / 100) * imgH;
    const y2 = imgY + imgH - (current.insetBottom / 100) * imgH;

    // Draw bright cropped region
    ctx.save();
    ctx.beginPath();
    if (current.shape === 'inset' || current.shape === 'rectangle' || current.shape === 'none') {
      const cr = Math.min(current.cornerRadius || 0, (x2 - x1) / 2, (y2 - y1) / 2);
      ctx.roundRect(x1, y1, x2 - x1, y2 - y1, cr);
    } else if (current.shape === 'circle') {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const r = Math.min(x2 - x1, y2 - y1) / 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (current.shape === 'ellipse') {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      ctx.ellipse(cx, cy, (x2 - x1) / 2, (y2 - y1) / 2, 0, 0, Math.PI * 2);
    } else if (current.shape === 'diamond') {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      ctx.moveTo(cx, y1); ctx.lineTo(x2, cy); ctx.lineTo(cx, y2); ctx.lineTo(x1, cy); ctx.closePath();
    } else if (current.shape === 'triangle') {
      const cx = (x1 + x2) / 2;
      ctx.moveTo(cx, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1, y2); ctx.closePath();
    } else if (current.shape === 'hexagon' || current.shape === 'octagon' || current.shape === 'pentagon') {
      const sides = current.shape === 'hexagon' ? 6 : current.shape === 'octagon' ? 8 : 5;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const r = Math.min(x2 - x1, y2 - y1) / 2;
      const sa = current.shape === 'hexagon' ? -Math.PI / 6 : current.shape === 'octagon' ? -Math.PI / 8 : -Math.PI / 2;
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 / sides) * i + sa;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (current.shape === 'star') {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const outerR = Math.min(x2 - x1, y2 - y1) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (current.shape === 'heart') {
      const cx = (x1 + x2) / 2;
      const topY = y1 + (y2 - y1) * 0.3;
      const bottomY = y1 + (y2 - y1) * 0.9;
      const boxW = x2 - x1;
      const boxH = y2 - y1;
      ctx.moveTo(cx, bottomY);
      ctx.bezierCurveTo(x1 - boxW * 0.05, y1 + boxH * 0.55, x1 - boxW * 0.05, topY - boxH * 0.15, cx, topY);
      ctx.bezierCurveTo(x2 + boxW * 0.05, topY - boxH * 0.15, x2 + boxW * 0.05, y1 + boxH * 0.55, cx, bottomY);
      ctx.closePath();
    }
    
    ctx.clip();
    // Redraw un-dimmed image inside clip
    ctx.drawImage(imgLoaded, imgX, imgY, imgW, imgH);
    ctx.restore();

    // Draw style border if configured
    if (current.borderWidth && current.borderWidth > 0) {
      ctx.strokeStyle = current.borderColor || '#10B981';
      ctx.lineWidth = current.borderWidth;
      ctx.save();
      ctx.beginPath();
      if (current.shape === 'inset' || current.shape === 'rectangle' || current.shape === 'none') {
        ctx.roundRect(x1, y1, x2 - x1, y2 - y1, current.cornerRadius || 0);
      } else if (current.shape === 'circle') {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const r = Math.min(x2 - x1, y2 - y1) / 2;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (current.shape === 'ellipse') {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        ctx.ellipse(cx, cy, (x2 - x1) / 2, (y2 - y1) / 2, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw the interactive crop box outline (white border)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // 6. Draw white corner handles (Figma / Windows Photos style)
    ctx.fillStyle = '#ffffff';
    const hs = 4;  // offset handle
    const hw = 14; // handle length
    const ht = 3;  // thickness

    // Top-Left
    ctx.fillRect(x1 - hs, y1 - hs, hw, ht);
    ctx.fillRect(x1 - hs, y1 - hs, ht, hw);

    // Top-Right
    ctx.fillRect(x2 - hw + hs, y1 - hs, hw, ht);
    ctx.fillRect(x2 + hs - ht, y1 - hs, ht, hw);

    // Bottom-Left
    ctx.fillRect(x1 - hs, y2 + hs - ht, hw, ht);
    ctx.fillRect(x1 - hs, y2 - hw + hs, ht, hw);

    // Bottom-Right
    ctx.fillRect(x2 - hw + hs, y2 + hs - ht, hw, ht);
    ctx.fillRect(x2 + hs - ht, y2 - hw + hs, ht, hw);

    ctx.restore();
  }, [imgLoaded, current, zoomScale]);

  // Redraw when properties change
  useEffect(() => {
    drawCropCanvas();
  }, [drawCropCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    const maxW = w - padding * 2;
    const maxH = h - padding * 2;
    const scale = Math.min(maxW / imgLoaded.width, maxH / imgLoaded.height) * zoomScale;
    const imgW = imgLoaded.width * scale;
    const imgH = imgLoaded.height * scale;
    const imgX = (w - imgW) / 2;
    const imgY = (h - imgH) / 2;

    const x1 = imgX + (current.insetLeft / 100) * imgW;
    const x2 = imgX + imgW - (current.insetRight / 100) * imgW;
    const y1 = imgY + (current.insetTop / 100) * imgH;
    const y2 = imgY + imgH - (current.insetBottom / 100) * imgH;

    const range = 18; // hit tolerance
    let dragType: DragState['type'] | null = null;

    if (Math.hypot(x - x1, y - y1) < range) dragType = 'tl';
    else if (Math.hypot(x - x2, y - y1) < range) dragType = 'tr';
    else if (Math.hypot(x - x1, y - y2) < range) dragType = 'bl';
    else if (Math.hypot(x - x2, y - y2) < range) dragType = 'br';
    else if (Math.abs(y - y1) < range && x > x1 && x < x2) dragType = 't';
    else if (Math.abs(y - y2) < range && x > x1 && x < x2) dragType = 'b';
    else if (Math.abs(x - x1) < range && y > y1 && y < y2) dragType = 'l';
    else if (Math.abs(x - x2) < range && y > y1 && y < y2) dragType = 'r';
    else if (x > x1 && x < x2 && y > y1 && y < y2) dragType = 'move';

    if (dragType) {
      canvas.setPointerCapture(e.pointerId);
      setDragState({
        type: dragType,
        startX: x,
        startY: y,
        startInsetLeft: current.insetLeft,
        startInsetRight: current.insetRight,
        startInsetTop: current.insetTop,
        startInsetBottom: current.insetBottom,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Hover cursor updates
    if (!dragState) {
      const w = canvas.width;
      const h = canvas.height;
      const padding = 40;
      const maxW = w - padding * 2;
      const maxH = h - padding * 2;
      const scale = Math.min(maxW / imgLoaded.width, maxH / imgLoaded.height) * zoomScale;
      const imgW = imgLoaded.width * scale;
      const imgH = imgLoaded.height * scale;
      const imgX = (w - imgW) / 2;
      const imgY = (h - imgH) / 2;

      const x1 = imgX + (current.insetLeft / 100) * imgW;
      const x2 = imgX + imgW - (current.insetRight / 100) * imgW;
      const y1 = imgY + (current.insetTop / 100) * imgH;
      const y2 = imgY + imgH - (current.insetBottom / 100) * imgH;

      const range = 18;
      if (Math.hypot(x - x1, y - y1) < range || Math.hypot(x - x2, y - y2) < range) {
        canvas.style.cursor = 'nwse-resize';
      } else if (Math.hypot(x - x2, y - y1) < range || Math.hypot(x - x1, y - y2) < range) {
        canvas.style.cursor = 'nesw-resize';
      } else if (Math.abs(y - y1) < range && x > x1 && x < x2) {
        canvas.style.cursor = 'ns-resize';
      } else if (Math.abs(y - y2) < range && x > x1 && x < x2) {
        canvas.style.cursor = 'ns-resize';
      } else if (Math.abs(x - x1) < range && y > y1 && y < y2) {
        canvas.style.cursor = 'ew-resize';
      } else if (Math.abs(x - x2) < range && y > y1 && y < y2) {
        canvas.style.cursor = 'ew-resize';
      } else if (x > x1 && x < x2 && y > y1 && y < y2) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    const maxW = w - padding * 2;
    const maxH = h - padding * 2;
    const scale = Math.min(maxW / imgLoaded.width, maxH / imgLoaded.height) * zoomScale;
    const imgW = imgLoaded.width * scale;
    const imgH = imgLoaded.height * scale;

    const dx = x - dragState.startX;
    const dy = y - dragState.startY;

    const pctX = (dx / imgW) * 100;
    const pctY = (dy / imgH) * 100;

    let nextLeft = dragState.startInsetLeft;
    let nextRight = dragState.startInsetRight;
    let nextTop = dragState.startInsetTop;
    let nextBottom = dragState.startInsetBottom;

    if (dragState.type === 'tl') {
      nextLeft = Math.max(0, Math.min(48, dragState.startInsetLeft + pctX));
      nextTop = Math.max(0, Math.min(48, dragState.startInsetTop + pctY));
    } else if (dragState.type === 'tr') {
      nextRight = Math.max(0, Math.min(48, dragState.startInsetRight - pctX));
      nextTop = Math.max(0, Math.min(48, dragState.startInsetTop + pctY));
    } else if (dragState.type === 'bl') {
      nextLeft = Math.max(0, Math.min(48, dragState.startInsetLeft + pctX));
      nextBottom = Math.max(0, Math.min(48, dragState.startInsetBottom - pctY));
    } else if (dragState.type === 'br') {
      nextRight = Math.max(0, Math.min(48, dragState.startInsetRight - pctX));
      nextBottom = Math.max(0, Math.min(48, dragState.startInsetBottom - pctY));
    } else if (dragState.type === 't') {
      nextTop = Math.max(0, Math.min(48, dragState.startInsetTop + pctY));
    } else if (dragState.type === 'b') {
      nextBottom = Math.max(0, Math.min(48, dragState.startInsetBottom - pctY));
    } else if (dragState.type === 'l') {
      nextLeft = Math.max(0, Math.min(48, dragState.startInsetLeft + pctX));
    } else if (dragState.type === 'r') {
      nextRight = Math.max(0, Math.min(48, dragState.startInsetRight - pctX));
    } else if (dragState.type === 'move') {
      const boxW = 100 - dragState.startInsetLeft - dragState.startInsetRight;
      const boxH = 100 - dragState.startInsetTop - dragState.startInsetBottom;

      nextLeft = dragState.startInsetLeft + pctX;
      nextRight = dragState.startInsetRight - pctX;
      nextTop = dragState.startInsetTop + pctY;
      nextBottom = dragState.startInsetBottom - pctY;

      if (nextLeft < 0) {
        nextLeft = 0; nextRight = 100 - boxW;
      }
      if (nextRight < 0) {
        nextRight = 0; nextLeft = 100 - boxW;
      }
      if (nextTop < 0) {
        nextTop = 0; nextBottom = 100 - boxH;
      }
      if (nextBottom < 0) {
        nextBottom = 0; nextTop = 100 - boxH;
      }
    }

    if (nextLeft + nextRight < 98 && nextTop + nextBottom < 98) {
      update({
        insetLeft: Math.round(nextLeft * 10) / 10,
        insetRight: Math.round(nextRight * 10) / 10,
        insetTop: Math.round(nextTop * 10) / 10,
        insetBottom: Math.round(nextBottom * 10) / 10,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setDragState(null);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-bg/60 p-2.5 rounded-xl border border-dark-border/40">
        
        {/* Left Side: Zoom & Reset */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomScale(z => Math.max(0.5, z - 0.1))}
            className="p-1.5 rounded bg-dark-card border border-dark-border text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Reducir zoom"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] text-gray-400 font-mono w-10 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale(z => Math.min(2.0, z + 0.1))}
            className="p-1.5 rounded bg-dark-card border border-dark-border text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn size={14} />
          </button>
          <div className="h-4 w-px bg-dark-border/60 mx-1" />
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-2 py-1 rounded bg-dark-card border border-dark-border text-xs text-gray-400 hover:text-white hover:border-emerald-500/50 transition-colors cursor-pointer"
            title="Restablecer recorte"
          >
            <RotateCcw size={13} />
            <span>Restablecer</span>
          </button>
        </div>

        {/* Center: Aspect Ratio Presets */}
        <div className="flex items-center bg-dark-card border border-dark-border rounded-lg p-0.5 space-x-0.5">
          {[
            { id: 'libre', label: 'Libre', val: null },
            { id: '1:1', label: '1:1 (Cuadrado)', val: 1.0 },
            { id: '16:9', label: '16:9 (Horizontal)', val: 16 / 9 },
            { id: '9:16', label: '9:16 (Vertical)', val: 9 / 16 },
            { id: '4:3', label: '4:3', val: 4 / 3 },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => applyAspectRatioPreset(r.id, r.val)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                activeRatio === r.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Right Side: Apply / Cancel */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-lg border border-dark-border text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer"
          >
            <Check size={14} />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* 2. Main Crop Viewport */}
      <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-dark-border/40 relative min-h-[380px] shadow-inner shadow-black/40">
        {!imgLoaded ? (
          <div className="flex flex-col items-center space-y-2.5 text-gray-400">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Cargando lienzo interactivo...</span>
          </div>
        ) : (
          <div className="relative group">
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full max-w-2xl h-auto border border-slate-800/80 rounded-xl shadow-2xl touch-none select-none"
            />
            
            {/* Guide overlay */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center space-x-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/5 text-[10px] text-gray-400">
              <Move size={10} className="text-emerald-400" />
              <span>Arrastra bordes o esquinas para recortar</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Rotation Slider Dial */}
      <div className="flex flex-col items-center space-y-1.5 bg-dark-bg/40 p-3 rounded-xl border border-dark-border/30">
        <div className="flex justify-between items-center w-full max-w-md px-1">
          <span className="text-xs font-semibold text-gray-400">Rotación Fina</span>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
            {current.rotation || 0}°
          </span>
        </div>
        
        <div className="flex items-center space-x-3 w-full max-w-md">
          <span className="text-[10px] text-gray-500 w-8">-180°</span>
          <input
            type="range"
            min="-180"
            max="180"
            value={current.rotation || 0}
            onChange={(e) => update({ rotation: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-[10px] text-gray-500 w-8 text-right">180°</span>
        </div>

        {/* Dial ticks visual styling decoration */}
        <div className="flex justify-between w-full max-w-xs text-[7px] text-gray-600 font-mono pt-1">
          <span>|</span>
          <span>.</span>
          <span>.</span>
          <span>|</span>
          <span>.</span>
          <span>.</span>
          <span className="text-emerald-500/60">0°</span>
          <span>.</span>
          <span>.</span>
          <span>|</span>
          <span>.</span>
          <span>.</span>
          <span>|</span>
        </div>
      </div>

      {/* 4. Style Controls Toggler */}
      <div className="border border-dark-border/40 rounded-xl overflow-hidden bg-dark-card/50">
        <button
          onClick={() => setShowStylePanel(!showStylePanel)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <span>Opciones de Estilo y Forma de Máscara (Opcional)</span>
          <span className="text-xs text-gray-400">{showStylePanel ? '▲ Ocultar' : '▼ Mostrar'}</span>
        </button>

        {showStylePanel && (
          <div className="p-4 border-t border-dark-border/40 space-y-4 bg-dark-bg/20 animate-in fade-in duration-200">
            {/* Shape Grid */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Forma geométrica de la máscara</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {shapes.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => update({ shape: s.value })}
                    title={s.label}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] leading-tight transition-all duration-200 cursor-pointer
                      ${current.shape === s.value
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                        : 'bg-dark-bg border border-dark-border text-gray-500 hover:text-gray-300 hover:border-gray-500'
                      }`}
                  >
                    {s.icon}
                    <span className="mt-1 truncate w-full text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub settings grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Corner Radius */}
              {['rectangle', 'rounded', 'inset'].includes(current.shape) && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-gray-300">Esquinas Redondeadas (Border Radius)</label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {current.cornerRadius}px
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={current.cornerRadius}
                    onChange={(e) => update({ cornerRadius: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              )}

              {/* Border Thickness */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-gray-300">Grosor del Borde</label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {current.borderWidth}px
                  </span>
                </div>
                <input
                  type="range" min="0" max="20" value={current.borderWidth}
                  onChange={(e) => update({ borderWidth: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Border Color */}
              {current.borderWidth > 0 && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-300 mb-2 block">Color del Borde</label>
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
                        type="color" value={current.borderColor}
                        onChange={(e) => update({ borderColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-full" style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
