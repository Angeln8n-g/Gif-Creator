import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, ClipboardPaste } from 'lucide-react';
import type { FrameImage, EffectMask } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  animation: 'Animación',
  transition: 'Transición',
  text: 'Texto',
  stickers: 'Stickers',
  crop: 'Recorte',
};

interface TimelineItemProps {
  frame: FrameImage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  /** Frame is the Effect_Clipboard source */
  isSource?: boolean;
  /** Frame is a marked Target_Frame */
  isTarget?: boolean;
  /** Clipboard active and frame is not source */
  canPaste?: boolean;
  /** For tooltip content */
  effectMask?: EffectMask;
  onCopyEffects?: (id: string) => void;
  onPasteEffects?: (id: string) => void;
  onToggleTarget?: (id: string) => void;
}

export function TimelineItem({
  frame,
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
}: TimelineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    // Base width: 100px per second. Max 500px, Min 60px.
    width: `${Math.max(60, Math.min(500, frame.duration * 100))}px`,
  };

  // Resize logic
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; duration: number } | null>(null);

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
      // 100px = 1 second
      const deltaDuration = deltaX / 100;
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
  }, [isResizing, frame.id, onDurationChange]);

  // Build tooltip text for paste button
  const pasteTooltip = effectMask && effectMask.size > 0
    ? [...effectMask].map((c) => CATEGORY_LABELS[c] ?? c).join(', ')
    : '';

  // Border/ring classes based on state priority: source > target > selected > default
  const borderClasses = isSource
    ? 'border-amber-400 ring-2 ring-amber-400 shadow-lg shadow-amber-400/20'
    : isTarget
    ? 'border-blue-400 ring-1 ring-blue-400 shadow-lg shadow-blue-400/20'
    : isSelected
    ? 'border-cta ring-1 ring-cta shadow-lg shadow-cta/20'
    : 'border-dark-border hover:border-gray-500';

  const handleFrameClick = () => {
    if (canPaste && onToggleTarget) {
      onToggleTarget(frame.id);
    } else {
      onSelect(frame.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleFrameClick}
      className={`timeline-item-container relative h-20 group shrink-0 bg-dark-card rounded-md border overflow-hidden cursor-grab active:cursor-grabbing select-none transition-shadow
        ${borderClasses}
        ${isDragging ? 'shadow-2xl shadow-black' : ''}
      `}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${frame.previewUrl})` }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/20 to-black/80 pointer-events-none" />
      
      {/* Source indicator badge */}
      {isSource && (
        <div className="absolute top-1 left-1 z-30 px-1.5 py-0.5 rounded bg-amber-400/90 text-dark-bg text-[9px] font-bold leading-tight pointer-events-none">
          ORIGEN
        </div>
      )}

      {/* Target indicator badge */}
      {isTarget && !isSource && (
        <div className="absolute top-1 left-1 z-30 px-1.5 py-0.5 rounded bg-blue-400/90 text-dark-bg text-[9px] font-bold leading-tight pointer-events-none">
          DESTINO
        </div>
      )}

      {/* Drag Handle area */}
      <div className="absolute inset-0 p-2 flex flex-col justify-between" {...attributes} {...listeners}>
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm">
            {frame.duration.toFixed(1)}s
          </span>
          <div className="flex gap-1">
            {frame.animation !== 'none' && <div className="w-2 h-2 rounded-full bg-cta" title="Animación" />}
            {frame.transition !== 'none' && <div className="w-2 h-2 rounded-full bg-purple-500" title="Transición" />}
            {frame.text && <div className="w-2 h-2 rounded-full bg-blue-500" title="Texto" />}
            {frame.stickers.length > 0 && <div className="w-2 h-2 rounded-full bg-yellow-500" title="Stickers" />}
            {frame.crop && frame.crop.shape !== 'none' && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Recorte" />}
          </div>
        </div>
      </div>

      {/* Copy effects button — shown on hover when no clipboard is active */}
      {!canPaste && !isSource && onCopyEffects && (
        <button
          onClick={(e) => { e.stopPropagation(); onCopyEffects(frame.id); }}
          className="absolute bottom-1 left-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white cursor-pointer"
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
          className="absolute bottom-1 left-1 z-30 p-1 rounded bg-cta/80 hover:bg-cta text-dark-bg cursor-pointer transition-colors"
          title={pasteTooltip ? `Pegar efectos: ${pasteTooltip}` : 'Pegar efectos'}
          aria-label="Pegar efectos en este frame"
        >
          <ClipboardPaste size={11} />
        </button>
      )}

      {/* Resize Handle (Right Edge) */}
      <div
        onPointerDown={handleResizeStart}
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-cta/50 flex items-center justify-center group/resizer z-20"
      >
        <div className="w-0.5 h-6 bg-white/50 rounded-full group-hover/resizer:bg-white transition-colors" />
      </div>
    </div>
  );
}
