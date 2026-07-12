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
  AnimationType,
  TransitionType,
  TextOverlay,
  StickerOverlay,
  CropSettings,
  EffectClipboard,
  EffectMask,
  EffectCategory,
  FilterType,
  ImageAdjustments,
} from '../types';
import { TimelineItem } from './TimelineItem';
import { FrameInspector } from './FrameInspector';
import { BatchFrameInspector } from './BatchFrameInspector';
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
}

export function TimelineEditor({ frames, setFrames, currentTime, playerRef, onReverseTimeline, onBoomerangTimeline }: TimelineEditorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
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

  // Batch controllers
  const handleRemoveSelected = useCallback(() => {
    setFrames((items) => items.filter((f) => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
  }, [selectedIds, setFrames]);

  const handleDurationChangeSelected = useCallback((duration: number) => {
    setFrames((items) =>
      items.map((f) => (selectedIds.has(f.id) ? { ...f, duration } : f))
    );
  }, [selectedIds, setFrames]);

  const handleAnimationChangeSelected = useCallback((animation: AnimationType) => {
    setFrames((items) =>
      items.map((f) => (selectedIds.has(f.id) ? { ...f, animation } : f))
    );
  }, [selectedIds, setFrames]);

  const handleTransitionChangeSelected = useCallback((transition: TransitionType) => {
    setFrames((items) =>
      items.map((f) => (selectedIds.has(f.id) ? { ...f, transition } : f))
    );
  }, [selectedIds, setFrames]);

  const handleTransitionDurationChangeSelected = useCallback((duration: number) => {
    setFrames((items) =>
      items.map((f) => (selectedIds.has(f.id) ? { ...f, transitionDuration: duration } : f))
    );
  }, [selectedIds, setFrames]);

  const handleFilterChangeSelected = useCallback((filter: FilterType) => {
    setFrames((items) =>
      items.map((f) => (selectedIds.has(f.id) ? { ...f, filter } : f))
    );
  }, [selectedIds, setFrames]);

  const handleAdjustmentsChangeSelected = useCallback((updateFn: (prev: ImageAdjustments | undefined) => ImageAdjustments | undefined) => {
    setFrames((items) =>
      items.map((f) => {
        if (selectedIds.has(f.id)) {
          return { ...f, adjustments: updateFn(f.adjustments) };
        }
        return f;
      })
    );
  }, [selectedIds, setFrames]);

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

  const handleRemove = (id: string) => {
    setFrames((items) => items.filter((i) => i.id !== id));
  };

  const handleDurationChange = (id: string, duration: number) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, duration } : i))
    );
  };

  const handleAnimationChange = (id: string, animation: AnimationType) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, animation } : i))
    );
  };

  const handleTransitionChange = (id: string, transition: TransitionType) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, transition } : i))
    );
  };

  const handleTransitionDurationChange = (id: string, duration: number) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, transitionDuration: duration } : i))
    );
  };

  const handleFilterChange = (id: string, filter: FilterType) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, filter } : i))
    );
  };

  const handleAdjustmentsChange = (id: string, adjustments: ImageAdjustments | undefined) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, adjustments } : i))
    );
  };

  const handleTextChange = (id: string, text: TextOverlay | undefined) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, text } : i))
    );
  };

  const handleStickersChange = (id: string, stickers: StickerOverlay[]) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, stickers } : i))
    );
  };

  const handleCropChange = (id: string, crop: CropSettings | undefined) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, crop } : i))
    );
  };

  const handleSfxChange = (id: string, sfx: FrameImage['sfx'] | undefined) => {
    setFrames((items) =>
      items.map((i) => (i.id === id ? { ...i, sfx } : i))
    );
  };

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

  const selectedFrame = selectedIds.size === 1 
    ? frames.find(f => selectedIds.has(f.id)) 
    : undefined;
  
  const selectedFrames = frames.filter(f => selectedIds.has(f.id));

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
    <div className="flex flex-col space-y-6">
      
      {/* Timeline Track (Floating Panel) */}
      <FloatingWrapper
        title="Línea de Tiempo Principal"
        defaultFloating={true} // Floating by default!
        width="880px"
        themeColor="purple"
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
            className={`overflow-x-auto custom-scrollbar pb-6 mb-2 relative cursor-pointer ${isScrubbing ? 'select-none touch-none' : ''}`}
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

      {/* Inspector (Properties Panel) */}
      {selectedIds.size === 1 && selectedFrame && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FrameInspector
            frame={selectedFrame}
            onRemove={handleRemove}
            onDurationChange={handleDurationChange}
            onAnimationChange={handleAnimationChange}
            onTransitionChange={handleTransitionChange}
            onTransitionDurationChange={handleTransitionDurationChange}
            onTextChange={handleTextChange}
            onStickersChange={handleStickersChange}
            onCropChange={handleCropChange}
            onSfxChange={handleSfxChange}
            onFilterChange={handleFilterChange}
            onAdjustmentsChange={handleAdjustmentsChange}
          />
        </div>
      )}

      {selectedIds.size > 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BatchFrameInspector
            selectedFrames={selectedFrames}
            onRemoveSelected={handleRemoveSelected}
            onDurationChangeSelected={handleDurationChangeSelected}
            onAnimationChangeSelected={handleAnimationChangeSelected}
            onTransitionChangeSelected={handleTransitionChangeSelected}
            onTransitionDurationChangeSelected={handleTransitionDurationChangeSelected}
            onFilterChangeSelected={handleFilterChangeSelected}
            onAdjustmentsChangeSelected={handleAdjustmentsChangeSelected}
          />
        </div>
      )}

    </div>
  );
}
