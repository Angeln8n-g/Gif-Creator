import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Copy, ClipboardPaste, Sparkles, Palette, ArrowRightLeft, 
  Type, Smile, Crop, Volume2 
} from 'lucide-react';
import type { FrameImage, EffectMask } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  animation: 'Animación',
  transition: 'Transición',
  text: 'Texto',
  stickers: 'Stickers',
  crop: 'Recorte',
  filter: 'Filtro',
};

interface TimelineItemProps {
  frame: FrameImage;
  index: number;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDurationChange: (id: string, duration: number) => void;
  isSource?: boolean;
  isTarget?: boolean;
  canPaste?: boolean;
  effectMask?: EffectMask;
  onCopyEffects?: (id: string) => void;
  onPasteEffects?: (id: string) => void;
  onToggleTarget?: (id: string) => void;
  zoom?: number; // Pixels per second
  onDoubleClick?: (id: string) => void;
}

export function TimelineItem({
  frame,
  index,
  isSelected,
  onSelect,
  onDurationChange,
  isSource,
  isTarget,
  canPaste,
  effectMask,
  onCopyEffects,
  onPasteEffects,
  onToggleTarget,
  zoom = 100,
  onDoubleClick,
}: TimelineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id });

  // Resize logic
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; duration: number } | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : transition, // disable transitions while resizing for real-time responsiveness
    zIndex: isDragging || isResizing ? 10 : 1,
    opacity: isDragging ? 0.7 : 1,
    // Width scales dynamically with zoom. Min 60px, Max 800px.
    width: `${Math.max(60, Math.min(800, frame.duration * zoom))}px`,
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, duration: frame.duration };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!resizeStartRef.current) return;
      const deltaX = e.clientX - resizeStartRef.current.x;
      // Duration change scales with zoom (zoom pixels = 1s)
      const deltaDuration = deltaX / zoom;
      let newDuration = resizeStartRef.current.duration + deltaDuration;
      // Clamp duration between 0.1s and 10s
      newDuration = Math.max(0.1, Math.min(10, newDuration));
      
      onDurationChange(frame.id, parseFloat(newDuration.toFixed(1)));
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, frame.id, onDurationChange, zoom]);

  // Build tooltip text for paste button
  const pasteTooltip = effectMask && effectMask.size > 0
    ? [...effectMask].map((c) => CATEGORY_LABELS[c] ?? c).join(', ')
    : '';

  // Border/ring classes based on state priority: source > target > selected > default
  const borderClasses = isSource
    ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
    : isTarget
    ? 'border-blue-400 ring-1 ring-blue-400/80 shadow-[0_0_10px_rgba(96,165,250,0.3)]'
    : isSelected
    ? 'border-cta ring-2 ring-cta/80 shadow-[0_0_12px_rgba(225,29,72,0.35)]'
    : 'border-dark-border hover:border-gray-500 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30';

  const handleFrameClick = (e: React.MouseEvent) => {
    if (canPaste && onToggleTarget) {
      onToggleTarget(frame.id);
    } else {
      onSelect(frame.id, e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleFrameClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(frame.id);
      }}
      className={`timeline-item-container relative h-20 group shrink-0 bg-dark-card rounded-xl border overflow-hidden cursor-grab active:cursor-grabbing select-none transition-all duration-200
        ${borderClasses}
        ${isDragging ? 'shadow-2xl shadow-black scale-[0.98]' : ''}
      `}
    >
      {/* Background Image Thumbnail */}
      <div 
        className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundImage: `url(${frame.previewUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/85 pointer-events-none" />
      
      {/* Real-time floating duration tooltip above handle when resizing */}
      {isResizing && (
        <div className="absolute -top-7 right-0 z-40 bg-cta text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg shadow-cta/30 animate-pulse whitespace-nowrap">
          {frame.duration.toFixed(1)}s
        </div>
      )}

      {/* Source indicator badge */}
      {isSource && (
        <div className="absolute top-1 left-1 z-30 px-1.5 py-0.5 rounded bg-amber-400/90 text-dark-bg text-[9px] font-extrabold leading-tight pointer-events-none tracking-wide shadow-sm">
          ORIGEN
        </div>
      )}

      {/* Target indicator badge */}
      {isTarget && !isSource && (
        <div className="absolute top-1 left-1 z-30 px-1.5 py-0.5 rounded bg-blue-400/90 text-dark-bg text-[9px] font-extrabold leading-tight pointer-events-none tracking-wide shadow-sm">
          DESTINO
        </div>
      )}

      {/* Sequence Index Number (Bottom-Right) */}
      <span className="absolute bottom-1 right-1 z-30 text-[9px] font-bold text-gray-400 bg-black/60 px-1.5 py-0.5 rounded border border-dark-border/40 select-none">
        #{index + 1}
      </span>

      {/* Drag Handle Area */}
      <div className="absolute inset-0 p-2 flex flex-col justify-between" {...attributes} {...listeners}>
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono text-white bg-black/65 px-1.5 py-0.5 rounded backdrop-blur-xs shadow-sm">
            {frame.duration.toFixed(1)}s
          </span>
          
          {/* Active Effects Pill Indicators */}
          <div className="flex gap-1 bg-black/50 p-1 rounded-md backdrop-blur-xs border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
            {frame.animation !== 'none' && <span title="Animación"><Sparkles size={10} className="text-cta" /></span>}
            {frame.filter && frame.filter !== 'none' && <span title="Filtro de Color"><Palette size={10} className="text-pink-400" /></span>}
            {frame.transition !== 'none' && <span title="Transición"><ArrowRightLeft size={10} className="text-purple-400" /></span>}
            {frame.text && <span title="Texto"><Type size={10} className="text-blue-400" /></span>}
            {frame.stickers.length > 0 && <span title="Stickers"><Smile size={10} className="text-yellow-400" /></span>}
            {frame.crop && frame.crop.shape !== 'none' && <span title="Recorte"><Crop size={10} className="text-emerald-400" /></span>}
            {frame.sfx && <span title="Sonido SFX"><Volume2 size={10} className="text-rose-400" /></span>}
          </div>
        </div>
      </div>

      {/* Copy effects button — shown on hover when no clipboard is active */}
      {!canPaste && !isSource && onCopyEffects && (
        <button
          onClick={(e) => { e.stopPropagation(); onCopyEffects(frame.id); }}
          className="absolute bottom-1 left-1 z-30 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg bg-black/75 hover:bg-black text-gray-300 hover:text-white cursor-pointer hover:scale-105 border border-dark-border/40"
          title="Copiar efectos"
          aria-label="Copiar efectos de este frame"
        >
          <Copy size={11} />
        </button>
      )}

      {/* Paste effects button — shown when clipboard is active and frame is eligible */}
      {canPaste && onPasteEffects && (
        <button
          onClick={(e) => { e.stopPropagation(); onPasteEffects(frame.id); }}
          className="absolute bottom-1 left-1 z-30 p-1.5 rounded-lg bg-cta hover:bg-rose-500 text-white cursor-pointer transition-all hover:scale-105 shadow-md shadow-cta/20"
          title={pasteTooltip ? `Pegar efectos: ${pasteTooltip}` : 'Pegar efectos'}
          aria-label="Pegar efectos en este frame"
        >
          <ClipboardPaste size={11} />
        </button>
      )}

      {/* Resize Handle (Right Edge, Styled like NLE track editor) */}
      <div
        onPointerDown={handleResizeStart}
        className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center z-20 transition-all duration-200 group/resizer
          ${isResizing ? 'bg-cta/30 border-l border-cta shadow-[0_0_8px_rgba(225,29,72,0.4)]' : 'hover:bg-cta/20 hover:border-l hover:border-cta/40'}
        `}
      >
        <div className={`w-0.5 h-6 rounded-full transition-all duration-200
          ${isResizing ? 'bg-cta' : 'bg-gray-500 group-hover/resizer:bg-gray-300'}
        `} />
      </div>
    </div>
  );
}
