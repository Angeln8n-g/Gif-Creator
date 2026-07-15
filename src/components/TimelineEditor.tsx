import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import type {
  FrameImage,
  EffectClipboard,
  EffectMask,
  EffectCategory,
} from '../types';
import { TimelineItem } from './TimelineItem';

import { CopyEffectsMenu } from './CopyEffectsMenu';
import { EffectsStatusBanner } from './EffectsStatusBanner';
import { PasteNotification } from './PasteNotification';
import { applyEffectMask } from '../utils/effectHelpers';
import { Layers, Clock, ArrowRightLeft, Repeat, ZoomIn, ZoomOut } from 'lucide-react';
import type { PreviewPlayerRef } from './PreviewPlayer';
import { FloatingWrapper } from './FloatingWrapper';

interface TimelineEditorProps {
  frames: FrameImage[];
  setFrames: React.Dispatch<React.SetStateAction<FrameImage[]>>;
  currentTime?: number;
  playerRef?: React.RefObject<PreviewPlayerRef | null>;
  onReverseTimeline?: () => void;
  onBoomerangTimeline?: () => void;
  selectedFrameIndex?: number | null;
  setSelectedFrameIndex?: (idx: number | null) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  lastSelectedId: string | null;
  setLastSelectedId: (id: string | null) => void;
}

export function TimelineEditor({ 
  frames, 
  setFrames, 
  currentTime, 
  playerRef, 
  onReverseTimeline, 
  onBoomerangTimeline,
  setSelectedFrameIndex,
  selectedIds,
  setSelectedIds,
  lastSelectedId,
  setLastSelectedId
}: TimelineEditorProps) {
  const [zoomLevel, setZoomLevel] = useState(100); // pixels per second
  const [isScrubbing, setIsScrubbing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  let playheadOffset = 0;

  // ─── Effects Copy-Paste State ───────────────────────────────────────────────
  const [effectClipboard, setEffectClipboard] = useState<EffectClipboard | null>(null);
  const [effectMask, setEffectMask] = useState<EffectMask>(new Set());
  const [targetFrameIds, setTargetFrameIds] = useState<Set<string>>(new Set());
  const [pasteNotificationCount, setPasteNotificationCount] = useState<number | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  // ────────────────────────────────────────────────────────────────────────────

  // ─── Context Menu & Frame Actions State ─────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; frameId: string } | null>(null);
  const [frameClipboard, setFrameClipboard] = useState<FrameImage[]>([]);

  // Hide context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  // ────────────────────────────────────────────────────────────────────────────


  // Auto-select first frame if selection is empty and frames are loaded
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (frames.some((f) => f.id === id)) {
          next.add(id);
        }
      });
      
      if (next.size === 0 && frames.length > 0) {
        next.add(frames[0].id);
        setLastSelectedId(frames[0].id);
      }
      return next;
    });
  }, [frames]);

  // Translate vertical mouse wheel scroll to horizontal scroll over the timeline container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      } else {
        el.scrollLeft += e.deltaX;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Auto-scroll the timeline container to keep the playhead in view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || currentTime === undefined) return;

    const visibleWidth = el.clientWidth;
    const scrollLeft = el.scrollLeft;
    const padding = 100; // boundary padding in pixels

    if (playheadOffset > scrollLeft + visibleWidth - padding) {
      el.scrollTo({
        left: playheadOffset - visibleWidth + padding,
        behavior: isScrubbing ? 'auto' : 'smooth',
      });
    } else if (playheadOffset < scrollLeft + padding) {
      el.scrollTo({
        left: Math.max(0, playheadOffset - padding),
        behavior: isScrubbing ? 'auto' : 'smooth',
      });
    }
  }, [playheadOffset, currentTime, isScrubbing]);

  const handleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      
      if (e?.ctrlKey || e?.metaKey) {
        // Toggle selection
        if (next.has(id)) {
          next.delete(id);
          if (lastSelectedId === id) {
            setLastSelectedId(next.size > 0 ? Array.from(next)[next.size - 1] : null);
          }
        } else {
          next.add(id);
          setLastSelectedId(id);
        }
      } else if (e?.shiftKey && lastSelectedId) {
        // Range selection
        const currentIndex = frames.findIndex((f) => f.id === id);
        const lastIndex = frames.findIndex((f) => f.id === lastSelectedId);
        
        if (currentIndex !== -1 && lastIndex !== -1) {
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          
          next.clear();
          for (let i = start; i <= end; i++) {
            next.add(frames[i].id);
          }
        }
      } else {
        // Single selection
        next.clear();
        next.add(id);
        setLastSelectedId(id);
      }
      
      return next;
    });
  }, [frames, lastSelectedId]);
  const handleDurationChange = useCallback((id: string, duration: number) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, duration } : i))
    );
  }, [setFrames]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFrames((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // ─── Frame Operations ────────────────────────────────────────────────────
  const handleDeleteFrames = useCallback((targetId?: string) => {
    const idsToDelete = targetId ? new Set([targetId]) : selectedIds;
    if (idsToDelete.size === 0) return;
    
    setFrames((prev) => prev.filter(f => !idsToDelete.has(f.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.delete(id));
      return next;
    });
    setContextMenu(null);
  }, [selectedIds, setFrames, setSelectedIds]);

  const handleDuplicateFrames = useCallback((targetId?: string) => {
    const idsToDuplicate = targetId ? new Set([targetId]) : selectedIds;
    if (idsToDuplicate.size === 0) return;
    
    setFrames((prev) => {
      const next = [...prev];
      let insertionIndex = next.length;
      
      // If single selection or targetId, insert after it
      if (idsToDuplicate.size === 1) {
        const id = Array.from(idsToDuplicate)[0];
        const idx = next.findIndex(f => f.id === id);
        if (idx !== -1) insertionIndex = idx + 1;
      }
      
      const toDuplicate = next.filter(f => idsToDuplicate.has(f.id));
      const duplicates = toDuplicate.map(f => ({
        ...f,
        id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      next.splice(insertionIndex, 0, ...duplicates);
      return next;
    });
    setContextMenu(null);
  }, [selectedIds, setFrames]);

  const handleCopyFrames = useCallback(() => {
    if (selectedIds.size === 0) return;
    const toCopy = frames.filter(f => selectedIds.has(f.id)).map(f => ({ ...f }));
    setFrameClipboard(toCopy);
  }, [frames, selectedIds]);

  const handlePasteFrames = useCallback(() => {
    if (frameClipboard.length === 0) return;
    
    setFrames((prev) => {
      const next = [...prev];
      let insertionIndex = next.length;
      if (lastSelectedId) {
        const idx = next.findIndex(f => f.id === lastSelectedId);
        if (idx !== -1) insertionIndex = idx + 1;
      }
      
      const newFrames = frameClipboard.map(f => ({
        ...f,
        id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      next.splice(insertionIndex, 0, ...newFrames);
      return next;
    });
  }, [frameClipboard, lastSelectedId, setFrames]);

  const handleEditFrame = useCallback((id: string) => {
    const index = frames.findIndex((f) => f.id === id);
    if (index !== -1 && setSelectedFrameIndex) {
      setSelectedFrameIndex(index);
    }
    setContextMenu(null);
  }, [frames, setSelectedFrameIndex]);

  // Global Keyboard listener for timeline frame operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Do not trigger if typing in an input
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteFrames();
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        handleCopyFrames();
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        handlePasteFrames();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); // Prevent browser bookmark dialog
        handleDuplicateFrames();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteFrames, handleCopyFrames, handlePasteFrames, handleDuplicateFrames]);
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Effects Copy-Paste Callbacks ──────────────────────────────────────────

  /** Reset all clipboard state */
  const clearClipboard = useCallback(() => {
    setEffectClipboard(null);
    setEffectMask(new Set());
    setTargetFrameIds(new Set());
    setShowCopyMenu(false);
  }, []);

  /** Open the copy menu for a given frame */
  const copyEffects = useCallback((frameId: string) => {
    const frame = frames.find((f) => f.id === frameId);
    if (!frame) return;

    const snapshot: EffectClipboard = {
      sourceFrameId: frameId,
      sourceEffects: {
        animation: frame.animation,
        transition: frame.transition,
        transitionDuration: frame.transitionDuration,
        text: frame.text,
        stickers: [...frame.stickers],
        crop: frame.crop ? { ...frame.crop } : undefined,
      },
    };

    setEffectClipboard(snapshot);
    // Preserve existing mask when replacing clipboard; reset targets
    setTargetFrameIds(new Set());
    setShowCopyMenu(true);
  }, [frames]);

  /** Toggle a single category in the mask */
  const toggleCategory = useCallback((cat: EffectCategory) => {
    setEffectMask((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const ALL_CATEGORIES: EffectCategory[] = ['animation', 'transition', 'text', 'stickers', 'crop'];

  const selectAll = useCallback(() => {
    setEffectMask(new Set(ALL_CATEGORIES));
  }, []);

  const deselectAll = useCallback(() => {
    setEffectMask(new Set());
  }, []);

  /** Called when user confirms the category selection in CopyEffectsMenu */
  const confirmCopyMenu = useCallback(() => {
    setShowCopyMenu(false);
  }, []);

  /** Toggle a frame as a paste target (source frame is never added) */
  const toggleTargetFrame = useCallback((id: string) => {
    if (!effectClipboard || id === effectClipboard.sourceFrameId) return;
    setTargetFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [effectClipboard]);

  /** Mark all frames except source as targets */
  const selectAllTargets = useCallback(() => {
    if (!effectClipboard) return;
    const allExceptSource = new Set(
      frames.filter((f) => f.id !== effectClipboard.sourceFrameId).map((f) => f.id)
    );
    setTargetFrameIds(allExceptSource);
  }, [effectClipboard, frames]);

  /** Paste to a single frame by id */
  const pasteToFrame = useCallback((id: string) => {
    if (!effectClipboard || id === effectClipboard.sourceFrameId) return;
    setFrames((items) =>
      items.map((f) =>
        f.id === id ? applyEffectMask(f, effectClipboard.sourceEffects, effectMask) : f
      )
    );
    setPasteNotificationCount(1);
  }, [effectClipboard, effectMask, setFrames]);

  /** Paste to all frames in targetFrameIds (excluding source) */
  const pasteToSelected = useCallback(() => {
    if (!effectClipboard) return;
    const eligible = [...targetFrameIds].filter((id) => id !== effectClipboard.sourceFrameId);
    if (eligible.length === 0) return;
    setFrames((items) =>
      items.map((f) =>
        eligible.includes(f.id)
          ? applyEffectMask(f, effectClipboard.sourceEffects, effectMask)
          : f
      )
    );
    setPasteNotificationCount(eligible.length);
  }, [effectClipboard, effectMask, targetFrameIds, setFrames]);

  /** Paste to every frame except source */
  const pasteToAll = useCallback(() => {
    if (!effectClipboard) return;
    const count = frames.filter((f) => f.id !== effectClipboard.sourceFrameId).length;
    setFrames((items) =>
      items.map((f) =>
        f.id !== effectClipboard.sourceFrameId
          ? applyEffectMask(f, effectClipboard.sourceEffects, effectMask)
          : f
      )
    );
    setPasteNotificationCount(count);
  }, [effectClipboard, effectMask, frames, setFrames]);

  // ─── Guard: clear clipboard if source frame is deleted ──────────────────────
  useEffect(() => {
    if (!effectClipboard) return;
    const sourceStillExists = frames.some((f) => f.id === effectClipboard.sourceFrameId);
    if (!sourceStillExists) {
      clearClipboard();
    }
  }, [frames, effectClipboard, clearClipboard]);

  // ────────────────────────────────────────────────────────────────────────────

  if (frames.length === 0) return null;

  playheadOffset = 0;
  let accumulatedTime = 0;

  if (currentTime !== undefined) {
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const width = Math.max(60, Math.min(800, f.duration * zoomLevel));
      const gap = 8; // space-x-2 is 8px
      
      if (currentTime >= accumulatedTime + f.duration) {
        playheadOffset += width + gap;
        accumulatedTime += f.duration;
      } else {
        const progress = (currentTime - accumulatedTime) / f.duration;
        playheadOffset += width * progress;
        break;
      }
    }
  }



  const calculateSeekTime = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    
    let accTime = 0;
    let currentX = 0;
    const gap = 8;
    
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const width = Math.max(60, Math.min(800, f.duration * zoomLevel));
      
      if (clickX >= currentX && clickX <= currentX + width) {
        const progress = (clickX - currentX) / width;
        return accTime + f.duration * progress;
      }
      
      currentX += width + gap;
      accTime += f.duration;
      
      if (clickX > currentX - gap && clickX < currentX) {
        return accTime;
      }
    }
    
    if (clickX >= currentX) {
      return accTime;
    }
    return 0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!playerRef?.current) return;
    
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button')) {
      return;
    }

    const time = calculateSeekTime(e.clientX);
    
    // If clicked exactly on a frame, just seek once so DndKit can still drag it
    const isTimelineItem = target.closest('.timeline-item-container');
    if (isTimelineItem) {
      playerRef.current.seek(time);
      return;
    }

    setIsScrubbing(true);
    playerRef.current.seek(time);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!playerRef?.current) return;
      e.preventDefault();
      const time = calculateSeekTime(e.clientX);
      playerRef.current.seek(time);
    };

    const handlePointerUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isScrubbing, frames, playerRef]);

  return (
    <div className="flex flex-col space-y-6 w-full max-w-full overflow-hidden">
      
      {/* Timeline Track (Floating Panel) */}
      <FloatingWrapper
        title="Línea de Tiempo Principal"
        defaultFloating={false} // Docked by default!
        width="880px"
        themeColor="purple"
        className="w-full max-w-full overflow-hidden"
        defaultPositionOffset={{
          x: typeof window !== 'undefined' ? (window.innerWidth - 880) / 2 : 520,
          y: typeof window !== 'undefined' ? window.innerHeight - 220 : 660,
        }}
      >
        <div className="relative overflow-hidden p-1">
          <div className="flex items-center space-x-2 mb-4 text-gray-400">
            <Layers size={18} />
            <h3 className="text-sm font-medium">Timeline Principal</h3>
            
            <div className="flex items-center space-x-2 ml-4 bg-dark-bg/50 px-3 py-1.5 rounded-lg border border-dark-border/50">
              <Clock size={14} className="text-gray-400" />
              <span className="text-xs text-gray-400">Duración global:</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={frames.length > 0 && frames.every(f => f.duration === frames[0].duration) ? frames[0].duration : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > 0) {
                    setFrames(items => items.map(i => ({ ...i, duration: val })));
                  }
                }}
                className="w-14 bg-dark-card text-white text-xs text-center border border-dark-border rounded-md px-1 py-0.5 focus:outline-none focus:border-cta"
                placeholder="--"
              />
              <span className="text-xs text-gray-400">s</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1.5 ml-4 bg-dark-bg/50 px-2.5 py-1 rounded-lg border border-dark-border/50 select-none">
              <ZoomOut size={12} className="text-gray-500" />
              <input
                type="range"
                min="50"
                max="250"
                step="10"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                className="w-16 h-1 bg-dark-card rounded-lg appearance-none cursor-pointer accent-cta"
              />
              <ZoomIn size={12} className="text-gray-500" />
              <span className="text-[9px] text-gray-400 font-mono w-8 text-center">{zoomLevel}%</span>
            </div>

            <span className="text-xs px-2 py-0.5 bg-dark-bg rounded-md ml-auto">
              Total: {frames.reduce((acc, f) => acc + f.duration, 0).toFixed(1)}s
            </span>

            {/* Reverse & Boomerang buttons */}
            {frames.length >= 2 && (
              <div className="flex items-center space-x-1.5 ml-2">
                <button
                  onClick={onReverseTimeline}
                  title="Invertir Timeline"
                  className="flex items-center space-x-1 px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-amber-400 bg-dark-bg hover:bg-dark-bg/80 border border-dark-border hover:border-amber-500/30 rounded-lg transition-all cursor-pointer"
                >
                  <ArrowRightLeft size={12} />
                  <span>Invertir</span>
                </button>
                <button
                  onClick={onBoomerangTimeline}
                  title="Efecto Bumerán (Ping-Pong)"
                  className="flex items-center space-x-1 px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-amber-400 bg-dark-bg hover:bg-dark-bg/80 border border-dark-border hover:border-amber-500/30 rounded-lg transition-all cursor-pointer"
                >
                  <Repeat size={12} />
                  <span>Bumerán</span>
                </button>
              </div>
            )}
          </div>

          <div 
            ref={containerRef}
            className={`w-full max-w-full overflow-x-auto custom-scrollbar pb-6 mb-2 relative cursor-pointer ${isScrubbing ? 'select-none touch-none' : ''}`}
            onPointerDown={handlePointerDown}
          >
            {/* Timeline Ruler */}
            <div className="flex space-x-2 min-w-max select-none text-[9px] font-mono text-gray-500 border-b border-dark-border/20 pb-1.5 mb-2.5 pr-12 pl-[1px]">
              {frames.map((frame, index) => {
                const width = Math.max(60, Math.min(800, frame.duration * zoomLevel));
                let startTime = 0;
                for (let i = 0; i < index; i++) {
                  startTime += frames[i].duration;
                }
                return (
                  <div 
                    key={`ruler-${frame.id}`} 
                    style={{ width: `${width}px` }} 
                    className="relative pl-1 border-l border-dark-border/30 flex flex-col justify-between h-5"
                  >
                    <span className="text-[9px] font-bold text-gray-400">{startTime.toFixed(1)}s</span>
                    <div className="flex justify-between w-full h-1 pr-1 pointer-events-none">
                      <div className="w-px h-1 bg-dark-border/35" />
                      {width > 120 && <div className="w-px h-1 bg-dark-border/35" />}
                      {width > 180 && <div className="w-px h-1 bg-dark-border/35" />}
                      <div className="w-px h-1 bg-dark-border/35" />
                    </div>
                  </div>
                );
              })}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={frames.map(f => f.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex space-x-2 min-w-max items-center relative">
                  {frames.map((frame, index) => (
                    <TimelineItem
                      key={frame.id}
                      frame={frame}
                      index={index}
                      isSelected={selectedIds.has(frame.id)}
                      onSelect={handleSelect}
                      onDurationChange={handleDurationChange}
                      isSource={effectClipboard?.sourceFrameId === frame.id}
                      isTarget={targetFrameIds.has(frame.id)}
                      canPaste={effectClipboard !== null && effectClipboard.sourceFrameId !== frame.id}
                      effectMask={effectMask}
                      onCopyEffects={copyEffects}
                      onPasteEffects={pasteToFrame}
                      onToggleTarget={toggleTargetFrame}
                      zoom={zoomLevel}
                      onDoubleClick={() => setSelectedFrameIndex?.(index)}
                      onContextMenu={(id, e) => {
                        // Ensure the frame is selected when right-clicked
                        if (!selectedIds.has(id)) {
                          handleSelect(id);
                        }
                        setContextMenu({ x: e.clientX, y: e.clientY, frameId: id });
                      }}
                    />
                  ))}
                  
                  {currentTime !== undefined && (
                    <div 
                      className="absolute top-[-28px] bottom-0 w-0.5 bg-cta z-50 pointer-events-none shadow-[0_0_8px_rgba(255,42,95,0.8)]"
                      style={{ left: `${playheadOffset}px` }}
                    >
                      <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-cta rounded-full shadow-[0_0_6px_rgba(255,42,95,1)] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </FloatingWrapper>

      {/* Copy Effects Menu */}
      {showCopyMenu && effectClipboard && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <CopyEffectsMenu
            sourceFrame={frames.find((f) => f.id === effectClipboard.sourceFrameId)!}
            mask={effectMask}
            onToggleCategory={toggleCategory}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onConfirm={confirmCopyMenu}
            onCancel={clearClipboard}
          />
        </div>
      )}

      {/* Effects Status Banner */}
      {effectClipboard !== null && !showCopyMenu && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <EffectsStatusBanner
            sourceIndex={(frames.findIndex((f) => f.id === effectClipboard.sourceFrameId) ?? 0) + 1}
            mask={effectMask}
            targetCount={targetFrameIds.size}
            onPasteToSelected={pasteToSelected}
            onPasteToAll={pasteToAll}
            onSelectAllTargets={selectAllTargets}
            onCancel={clearClipboard}
          />
        </div>
      )}

      {/* Paste Notification */}
      {pasteNotificationCount !== null && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PasteNotification
            count={pasteNotificationCount}
            onDismiss={() => setPasteNotificationCount(null)}
          />
        </div>
      )}

      {/* Frame Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 min-w-[160px] bg-dark-bg border border-dark-border rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 170), 
            top: Math.min(contextMenu.y, window.innerHeight - 150) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-dark-border/50">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Opciones de Fotograma</span>
          </div>
          <div className="p-1 flex flex-col">
            <button
              onClick={() => handleEditFrame(contextMenu.frameId)}
              className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-card rounded-lg transition-colors cursor-pointer w-full text-left"
            >
              <span>✏️</span>
              <span>Editar</span>
            </button>
            <button
              onClick={() => handleCopyFrames()}
              className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-card rounded-lg transition-colors cursor-pointer w-full text-left"
            >
              <span>📋</span>
              <span>Copiar (Ctrl+C)</span>
            </button>
            <button
              onClick={() => handleDuplicateFrames(contextMenu.frameId)}
              className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-card rounded-lg transition-colors cursor-pointer w-full text-left"
            >
              <span>✨</span>
              <span>Duplicar (Ctrl+D)</span>
            </button>
            <div className="h-px bg-dark-border/50 my-1 mx-2" />
            <button
              onClick={() => handleDeleteFrames(contextMenu.frameId)}
              className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer w-full text-left"
            >
              <span>🗑️</span>
              <span>Borrar (Supr)</span>
            </button>
          </div>
        </div>
      )}



    </div>
  );
}
