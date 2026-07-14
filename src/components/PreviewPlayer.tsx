import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { FrameImage, CropSettings } from '../types';
import { Play, Pause, SkipBack, SkipForward, GripHorizontal, Minimize2, Maximize2, Pin, PinOff, RotateCcw } from 'lucide-react';
import { renderDrawingsToContext } from '../canvas/canvasRenderer';

// Easing helpers
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function bounceEase(t: number): number {
  const n1 = 7.5625, d1 = 2.75;
  let x = t;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

// Draw image covering the canvas (object-contain style) — module-level function
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  if (!img.naturalWidth) return;
  const ratio = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * ratio;
  const h = img.naturalHeight * ratio;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

// Build a clipping path for a crop shape
function buildCropPath(
  ctx: CanvasRenderingContext2D,
  crop: CropSettings,
  cw: number,
  ch: number
) {
  const m = crop.margin;
  const p = crop.padding;
  const offset = m + p;

  // Effective draw area after margin + padding
  const x = offset;
  const y = offset;
  const w = cw - offset * 2;
  const h = ch - offset * 2;

  if (w <= 0 || h <= 0) return;

  ctx.beginPath();

  switch (crop.shape) {
    case 'rectangle':
    case 'inset': {
      const cr = Math.min(crop.cornerRadius, w / 2, h / 2);
      // Apply inset cropping for rectangle/inset
      const iTop = (crop.insetTop / 100) * h;
      const iRight = (crop.insetRight / 100) * w;
      const iBottom = (crop.insetBottom / 100) * h;
      const iLeft = (crop.insetLeft / 100) * w;
      const rx = x + iLeft;
      const ry = y + iTop;
      const rw = w - iLeft - iRight;
      const rh = h - iTop - iBottom;
      if (rw <= 0 || rh <= 0) return;
      ctx.roundRect(rx, ry, rw, rh, cr);
      break;
    }
    case 'rounded': {
      const cr = Math.min(Math.max(crop.cornerRadius, 8), w / 2, h / 2);
      ctx.roundRect(x, y, w, h, cr);
      break;
    }
    case 'circle': {
      const radius = Math.min(w, h) / 2;
      ctx.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2);
      break;
    }
    case 'ellipse': {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    }
    case 'diamond': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, cy);
      ctx.lineTo(cx, y + h);
      ctx.lineTo(x, cy);
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'octagon': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'star': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'heart': {
      const cx = x + w / 2;
      const topY = y + h * 0.3;
      const bottomY = y + h * 0.9;
      ctx.moveTo(cx, bottomY);
      // Left curve
      ctx.bezierCurveTo(
        x - w * 0.05, y + h * 0.55,
        x - w * 0.05, topY - h * 0.15,
        cx, topY
      );
      // Right curve
      ctx.bezierCurveTo(
        x + w * 1.05, topY - h * 0.15,
        x + w * 1.05, y + h * 0.55,
        cx, bottomY
      );
      ctx.closePath();
      break;
    }
    case 'triangle': {
      const cx = x + w / 2;
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    }
    case 'pentagon': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'freeform': {
      const points = crop.freeformPoints;
      if (points && points.length >= 3) {
        points.forEach((pt, i) => {
          const px = x + (pt.x / 100) * w;
          const py = y + (pt.y / 100) * h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      } else {
        // Not enough points — fallback to full rect
        ctx.rect(x, y, w, h);
      }
      break;
    }
    default:
      ctx.rect(x, y, w, h);
      break;
  }
}

export function getCanvasFilter(filter: string | undefined): string {
  if (!filter || filter === 'none') return 'none';
  switch (filter) {
    case 'grayscale': return 'grayscale(100%)';
    case 'sepia': return 'sepia(100%)';
    case 'invert': return 'invert(100%)';
    case 'blur': return 'blur(4px)';
    case 'warm': return 'contrast(115%) brightness(105%) sepia(30%) saturate(125%)';
    case 'cool': return 'contrast(100%) brightness(100%) sepia(0%) saturate(80%) hue-rotate(180deg)';
    case 'vintage': return 'sepia(60%) contrast(80%) brightness(95%) saturate(80%)';
    case 'cyberpunk': return 'hue-rotate(295deg) saturate(160%) contrast(115%) brightness(95%)';
    default: return 'none';
  }
}

// Apply crop clipping and draw border around the clipped area
function applyCropAndDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: FrameImage,
  cw: number,
  ch: number
) {
  const crop = frame.crop;

  // Build combined CSS filter from preset + adjustments
  const filterParts: string[] = [];
  if (frame.filter && frame.filter !== 'none') {
    filterParts.push(getCanvasFilter(frame.filter));
  }
  if (frame.adjustments) {
    const a = frame.adjustments;
    const effectiveBrightness = a.brightness * (1 + a.exposure);
    filterParts.push(`brightness(${effectiveBrightness}) contrast(${a.contrast}) saturate(${a.saturation})`);
  }
  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(' ');
  }

  if (!crop || crop.shape === 'none') {
    drawImageCover(ctx, img, cw, ch);
    ctx.filter = 'none';
    // Temperature overlay
    if (frame.adjustments && frame.adjustments.temperature !== 0) {
      const temp = frame.adjustments.temperature;
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = Math.abs(temp) / 200;
      ctx.fillStyle = temp > 0 ? '#F59E0B' : '#3B82F6';
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    return;
  }

  // Draw background (margin area stays black)
  ctx.save();
  buildCropPath(ctx, crop, cw, ch);
  ctx.clip();
  drawImageCover(ctx, img, cw, ch);
  ctx.restore();

  ctx.filter = 'none';

  // Draw border
  if (crop.borderWidth > 0) {
    ctx.save();
    buildCropPath(ctx, crop, cw, ch);
    ctx.lineWidth = crop.borderWidth;
    ctx.strokeStyle = crop.borderColor;
    ctx.stroke();
    ctx.restore();
  }
}

interface PreviewPlayerProps {
  frames: FrameImage[];
  globalSpeed: number;
  onTimeUpdate?: (time: number) => void;
  isPlaying?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  audioTrack?: File | null;
  audioVolume?: number;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface PreviewPlayerRef {
  seek: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  isPlaying: boolean;
}

export const PreviewPlayer = forwardRef<PreviewPlayerRef, PreviewPlayerProps>(({
  frames,
  globalSpeed,
  onTimeUpdate,
  isPlaying: externalIsPlaying,
  onPlayStateChange,
  audioTrack,
  audioVolume = 1,
  watermarkText,
  watermarkOpacity,
  watermarkPosition
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;

  const setIsPlaying = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      const nextVal = val(isPlaying);
      if (externalIsPlaying === undefined) setInternalIsPlaying(nextVal);
      if (onPlayStateChange) onPlayStateChange(nextVal);
    } else {
      if (externalIsPlaying === undefined) setInternalIsPlaying(val);
      if (onPlayStateChange) onPlayStateChange(val);
    }
  }, [externalIsPlaying, isPlaying, onPlayStateChange]);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Floating Window States
  const [isFloating, setIsFloating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasPositioned, setHasPositioned] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  // Check if screen is mobile size
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set initial position once window size is known (on client side)
  useEffect(() => {
    if (isFloating && !hasPositioned && !isMobile) {
      const initialX = Math.max(20, window.innerWidth - 720);
      const initialY = 100;
      setPosition({ x: initialX, y: initialY });
      setHasPositioned(true);
    }
  }, [isFloating, hasPositioned, isMobile]);

  // Adjust position if window is resized to keep it in viewport
  useEffect(() => {
    if (!isFloating || isMobile) return;
    const handleResize = () => {
      setPosition(prev => {
        const width = 680;
        const newX = Math.max(10 - width / 2, Math.min(window.innerWidth - width / 2, prev.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 80, prev.y));
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFloating, isMobile]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFloating || isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Failed to set pointer capture:", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    let newX = positionStartRef.current.x + dx;
    let newY = positionStartRef.current.y + dy;
    
    const width = 680;
    newX = Math.max(10 - width / 2, Math.min(window.innerWidth - width / 2, newX));
    newY = Math.max(10, Math.min(window.innerHeight - 80, newY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const resetPosition = () => {
    const initialX = Math.max(20, window.innerWidth - 720);
    const initialY = 100;
    setPosition({ x: initialX, y: initialY });
  };
  const frameProgressRef = useRef(0);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const drawingsCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const drawingsJsonRef = useRef<Map<string, string>>(new Map());
  const stickerImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const currentFrameRef = useRef(0);

  const lastSfxFrameRef = useRef<number>(-1);

  // Reset last SFX frame reference when we pause
  useEffect(() => {
    if (!isPlaying) {
      lastSfxFrameRef.current = -1;
    }
  }, [isPlaying]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle audio source loading and loop settings
  useEffect(() => {
    if (audioTrack) {
      const url = URL.createObjectURL(audioTrack);
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
      } else {
        audioRef.current.src = url;
      }
      audioRef.current.loop = true;
      audioRef.current.volume = audioVolume;
      audioRef.current.playbackRate = globalSpeed;
      
      // If currently playing, start the audio
      if (isPlaying) {
        audioRef.current.play().catch(err => console.log("Audio play failed on source change:", err));
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        URL.revokeObjectURL(url);
      };
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
  }, [audioTrack]);

  // Sync volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Sync playback speed rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = globalSpeed;
    }
  }, [globalSpeed]);

  // Sync play/pause state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(err => console.log("Audio play failed on play/pause sync:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Preload images
  useEffect(() => {
    const map = new Map<string, HTMLImageElement>();
    frames.forEach(frame => {
      const img = new Image();
      img.src = frame.previewUrl;
      map.set(frame.id, img);
    });
    imagesRef.current = map;
  }, [frames]);

  // Preload and cache drawings
  useEffect(() => {
    frames.forEach((frame) => {
      const drawingsJson = JSON.stringify(frame.drawings || []);
      const cachedJson = drawingsJsonRef.current.get(frame.id);

      if (frame.drawings && frame.drawings.length > 0) {
        if (cachedJson !== drawingsJson) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 960;
          tempCanvas.height = 540;
          
          renderDrawingsToContext(tempCanvas.getContext('2d') as any, frame.drawings, 960, 540)
            .then(() => {
              drawingsCacheRef.current.set(frame.id, tempCanvas);
              drawingsJsonRef.current.set(frame.id, drawingsJson);
            })
            .catch((err) => {
              console.error('Failed to pre-render drawings:', err);
            });
        }
      } else {
        drawingsCacheRef.current.delete(frame.id);
        drawingsJsonRef.current.delete(frame.id);
      }
    });
  }, [frames]);

  useImperativeHandle(ref, () => ({
    seek: (timeInSeconds: number) => {
      let accumulated = 0;
      let targetFrame = 0;
      let frameProgress = 0;
      
      for (let i = 0; i < frames.length; i++) {
        const d = frames[i].duration;
        if (timeInSeconds >= accumulated && timeInSeconds < accumulated + d) {
          targetFrame = i;
          frameProgress = timeInSeconds - accumulated;
          break;
        }
        accumulated += d;
        if (i === frames.length - 1) {
          targetFrame = i;
          frameProgress = d; // At the end
        }
      }
      
      setCurrentFrame(targetFrame);
      currentFrameRef.current = targetFrame;
      frameProgressRef.current = frameProgress;

      // Sync audio playhead
      if (audioRef.current) {
        if (audioRef.current.duration) {
          audioRef.current.currentTime = timeInSeconds % audioRef.current.duration;
        } else {
          audioRef.current.currentTime = timeInSeconds;
        }
      }
      
      if (onTimeUpdate) {
        onTimeUpdate(timeInSeconds);
      }
      
      // Force a re-render of the frame immediately
      if (!isPlaying && canvasRef.current && imagesRef.current.has(frames[targetFrame].id)) {
        // A minimal re-render just to show the frame, or rely on the next animation frame if playing
        // Actually, since we're using requestAnimationFrame for rendering, we should maybe trigger a single render pass
        // if not playing.
        lastTimeRef.current = performance.now();
      }
    },
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    togglePlay: () => setIsPlaying(p => !p),
    isPlaying
  }), [frames, isPlaying, onTimeUpdate]);

  // Apply animation transform to the canvas context
  const applyAnimation = useCallback((
    ctx: CanvasRenderingContext2D,
    frame: FrameImage,
    progress: number,
    w: number,
    h: number
  ) => {
    const t = easeInOut(progress);
    const anim = frame.animation;

    switch (anim) {
      case 'zoom-in': {
        const scale = 1 + t * 0.3;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        break;
      }
      case 'zoom-out': {
        const scale = 1.3 - t * 0.3;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        break;
      }
      case 'pan-left':
        ctx.translate(-t * w * 0.15, 0);
        break;
      case 'pan-right':
        ctx.translate(t * w * 0.15, 0);
        break;
      case 'pan-up':
        ctx.translate(0, -t * h * 0.15);
        break;
      case 'pan-down':
        ctx.translate(0, t * h * 0.15);
        break;
      case 'fade-in':
        ctx.globalAlpha = t;
        break;
      case 'fade-out':
        ctx.globalAlpha = 1 - t * 0.8;
        break;
      case 'rotate-cw': {
        const angle = t * 5 * (Math.PI / 180);
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        ctx.translate(-w / 2, -h / 2);
        break;
      }
      case 'rotate-ccw': {
        const angle = -t * 5 * (Math.PI / 180);
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        ctx.translate(-w / 2, -h / 2);
        break;
      }
      case 'parallax': {
        const offset = (t - 0.5) * w * 0.1;
        ctx.translate(offset, 0);
        const scale = 1 + Math.abs(t - 0.5) * 0.1;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        break;
      }
      case 'bounce': {
        const b = bounceEase(progress);
        const offsetY = -Math.abs(Math.sin(b * Math.PI * 2)) * h * 0.05;
        ctx.translate(0, offsetY);
        break;
      }
      default:
        break;
    }
  }, []);

  // Apply transition: draw the blended result of current and next frame
  const applyTransition = useCallback((
    ctx: CanvasRenderingContext2D,
    currentImg: HTMLImageElement,
    nextImg: HTMLImageElement | null,
    frame: FrameImage,
    nextFrameFilter: string | undefined,
    progress: number,
    w: number,
    h: number
  ) => {
    if (!nextImg || frame.transition === 'none' || progress < (1 - frame.transitionDuration / frame.duration)) {
      return false; // No transition active
    }

    const drawImageWithFilter = (c: CanvasRenderingContext2D, image: HTMLImageElement, fStr: string | undefined, cw: number, ch: number) => {
      // Build combined CSS filter from preset + adjustments
      const parts: string[] = [];
      if (fStr && fStr !== 'none') {
        parts.push(getCanvasFilter(fStr));
      }
      if (frame.adjustments) {
        const a = frame.adjustments;
        const effectiveBrightness = a.brightness * (1 + a.exposure);
        parts.push(`brightness(${effectiveBrightness}) contrast(${a.contrast}) saturate(${a.saturation})`);
      }
      if (parts.length > 0) {
        c.filter = parts.join(' ');
      }
      drawImageCover(c, image, cw, ch);
      c.filter = 'none';
      // Temperature overlay
      if (frame.adjustments && frame.adjustments.temperature !== 0) {
        const temp = frame.adjustments.temperature;
        c.save();
        c.globalCompositeOperation = 'color';
        c.globalAlpha = Math.abs(temp) / 200;
        c.fillStyle = temp > 0 ? '#F59E0B' : '#3B82F6';
        c.fillRect(0, 0, cw, ch);
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 1;
        c.restore();
      }
    };

    // Compute transition progress: 0..1 within the transition window
    const transWindow = frame.transitionDuration / frame.duration;
    const tp = easeInOut((progress - (1 - transWindow)) / transWindow);

    switch (frame.transition) {
      case 'crossfade':
        ctx.globalAlpha = 1 - tp;
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.globalAlpha = tp;
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.globalAlpha = 1;
        return true;

      case 'slide-left':
        ctx.save();
        ctx.translate(-tp * w, 0);
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.translate(w, 0);
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'slide-right':
        ctx.save();
        ctx.translate(tp * w, 0);
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.translate(-w, 0);
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'slide-up':
        ctx.save();
        ctx.translate(0, -tp * h);
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.translate(0, h);
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'slide-down':
        ctx.save();
        ctx.translate(0, tp * h);
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.translate(0, -h);
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'wipe-left':
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, tp * w, h);
        ctx.clip();
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'wipe-right':
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(w - tp * w, 0, tp * w, h);
        ctx.clip();
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'wipe-up':
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, h - tp * h, w, tp * h);
        ctx.clip();
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'wipe-down':
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, tp * h);
        ctx.clip();
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        return true;

      case 'fade-black':
        if (tp < 0.5) {
          ctx.globalAlpha = 1 - tp * 2;
          drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        } else {
          ctx.globalAlpha = (tp - 0.5) * 2;
          drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        }
        ctx.globalAlpha = 1;
        return true;

      case 'fade-white':
        if (tp < 0.5) {
          ctx.globalAlpha = 1 - tp * 2;
          drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
          ctx.fillStyle = `rgba(255, 255, 255, ${tp * 2})`;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.globalAlpha = (tp - 0.5) * 2;
          drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
          ctx.fillStyle = `rgba(255, 255, 255, ${(1 - tp) * 2})`;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.globalAlpha = 1;
        return true;

      case 'zoom-in':
        ctx.save();
        ctx.globalAlpha = 1 - tp;
        ctx.translate(w / 2, h / 2);
        const scaleCurrent = 1 + tp * 0.5;
        ctx.scale(scaleCurrent, scaleCurrent);
        ctx.translate(-w / 2, -h / 2);
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = tp;
        ctx.translate(w / 2, h / 2);
        const scaleNext = 0.5 + tp * 0.5;
        ctx.scale(scaleNext, scaleNext);
        ctx.translate(-w / 2, -h / 2);
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        ctx.globalAlpha = 1;
        return true;

      case 'zoom-out':
        ctx.save();
        ctx.globalAlpha = 1 - tp;
        ctx.translate(w / 2, h / 2);
        const scaleCurrentOut = 1 - tp * 0.3;
        ctx.scale(scaleCurrentOut, scaleCurrentOut);
        ctx.translate(-w / 2, -h / 2);
        drawImageWithFilter(ctx, currentImg, frame.filter, w, h);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = tp;
        ctx.translate(w / 2, h / 2);
        const scaleNextOut = 1.5 - tp * 0.5;
        ctx.scale(scaleNextOut, scaleNextOut);
        ctx.translate(-w / 2, -h / 2);
        drawImageWithFilter(ctx, nextImg, nextFrameFilter, w, h);
        ctx.restore();
        ctx.globalAlpha = 1;
        return true;

      default:
        return false;
    }
  }, []);

  // Draw text overlay
  const drawText = useCallback((ctx: CanvasRenderingContext2D, frame: FrameImage, progress: number, w: number, h: number) => {
    const txt = frame.text;
    if (!txt || !txt.content.trim()) return;

    const x = (txt.x / 100) * w;
    const y = (txt.y / 100) * h;
    const fontSize = txt.fontSize * (w / 640); // scale relative to preview size

    ctx.save();

    // Text animation
    let alpha = 1;
    let offsetY = 0;
    let displayText = txt.content;

    switch (txt.animation) {
      case 'fade-in':
        alpha = easeInOut(Math.min(progress * 3, 1));
        break;
      case 'slide-up':
        offsetY = (1 - easeInOut(Math.min(progress * 3, 1))) * fontSize * 1.5;
        break;
      case 'bounce': {
        const bt = bounceEase(Math.min(progress * 2, 1));
        offsetY = -(1 - bt) * fontSize;
        break;
      }
      case 'typewriter': {
        const chars = Math.floor(easeInOut(Math.min(progress * 2, 1)) * txt.content.length);
        displayText = txt.content.substring(0, chars);
        break;
      }
      case 'typewriter-cursor': {
        const chars = Math.floor(easeInOut(Math.min(progress * 2, 1)) * txt.content.length);
        displayText = txt.content.substring(0, chars);
        if (progress < 1.0 && Math.floor(progress * 15) % 2 === 0) {
          displayText += '|';
        }
        break;
      }
    }

    ctx.translate(x, y + offsetY);

    // Advanced scaling and rotating entry animations
    if (txt.animation === 'elastic') {
      const t = Math.min(progress * 2, 1);
      let scale = 1;
      if (t < 1) {
        scale = 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
        alpha = t;
      }
      ctx.scale(scale, scale);
    } else if (txt.animation === 'spin-in') {
      const t = Math.min(progress * 2.5, 1);
      alpha = t;
      ctx.rotate((1 - t) * Math.PI * 2);
    } else if (txt.animation === 'fade-zoom') {
      const t = Math.min(progress * 3, 1);
      alpha = t;
      ctx.scale(t, t);
    } else if (txt.animation === 'rotate-3d') {
      const t = Math.min(progress * 2.5, 1);
      alpha = t;
      const scaleX = Math.abs(Math.cos((1 - t) * Math.PI));
      ctx.scale(scaleX, 1);
    }

    // Camera movement
    if (txt.cameraMovement && txt.cameraMovement !== 'none') {
      const t = easeInOut(progress);
      switch (txt.cameraMovement) {
        case 'zoom-in': { const scale = 1 + t * 0.3; ctx.scale(scale, scale); break; }
        case 'zoom-out': { const scale = 1.3 - t * 0.3; ctx.scale(scale, scale); break; }
        case 'pan-left': ctx.translate(-t * w * 0.15, 0); break;
        case 'pan-right': ctx.translate(t * w * 0.15, 0); break;
        case 'pan-up': ctx.translate(0, -t * h * 0.15); break;
        case 'pan-down': ctx.translate(0, t * h * 0.15); break;
        case 'rotate-cw': ctx.rotate(t * 5 * (Math.PI / 180)); break;
        case 'rotate-ccw': ctx.rotate(-t * 5 * (Math.PI / 180)); break;
      }
    }

    // Static rotation
    if (txt.rotation) {
      ctx.rotate(txt.rotation * Math.PI / 180);
    }

    // Transition (Exit)
    if (txt.transition && txt.transition !== 'none') {
      const transWindow = frame.transitionDuration / frame.duration;
      if (progress >= (1 - transWindow) && transWindow > 0) {
        const tp = easeInOut((progress - (1 - transWindow)) / transWindow);
        switch (txt.transition) {
          case 'crossfade': alpha *= (1 - tp); break;
          case 'slide-left': ctx.translate(-tp * w, 0); break;
          case 'slide-right': ctx.translate(tp * w, 0); break;
          case 'slide-up': ctx.translate(0, -tp * h); break;
          case 'slide-down': ctx.translate(0, tp * h); break;
        }
      }
    }

    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px ${txt.fontFamily}, sans-serif`;
    ctx.textAlign = txt.align || 'center';
    ctx.textBaseline = 'middle';
    
    // Shadow
    ctx.shadowColor = txt.shadowColor;
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const lines = displayText.split('\n');
    const lineSpacing = fontSize * 1.25;

    // Draw background boxes first
    if (txt.backgroundColor && (txt.backgroundOpacity ?? 0) > 0) {
      ctx.save();
      // Remove shadow for background boxes
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      const opacity = txt.backgroundOpacity ?? 0.8;
      ctx.fillStyle = txt.backgroundColor;
      ctx.globalAlpha = alpha * opacity;
      
      lines.forEach((line, idx) => {
        if (!line.trim()) return;
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        const boxHeight = fontSize * 1.2;
        const paddingX = fontSize * 0.35;
        const paddingY = fontSize * 0.1;
        
        // Offset Y for this line
        const ly = (idx - (lines.length - 1) / 2) * lineSpacing;
        
        let lx = 0;
        if (ctx.textAlign === 'center') {
          lx = -textWidth / 2 - paddingX;
        } else if (ctx.textAlign === 'left') {
          lx = -paddingX;
        } else if (ctx.textAlign === 'right') {
          lx = -textWidth - paddingX;
        }
        
        // Draw rounded rectangle
        const rx = lx;
        const ry = ly - boxHeight / 2 - paddingY;
        const rw = textWidth + paddingX * 2;
        const rh = boxHeight + paddingY * 2;
        const radius = fontSize * 0.2; // rounded corners
        
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    // Draw text (fill & stroke)
    lines.forEach((line, idx) => {
      const ly = (idx - (lines.length - 1) / 2) * lineSpacing;
      
      // Outline
      if (txt.outlineWidth && txt.outlineWidth > 0 && txt.outlineColor) {
        ctx.save();
        ctx.strokeStyle = txt.outlineColor;
        ctx.lineWidth = txt.outlineWidth * (w / 640);
        ctx.lineJoin = 'round';
        ctx.strokeText(line, 0, ly);
        ctx.restore();
      }
      
      // Fill
      ctx.fillStyle = txt.color;
      ctx.fillText(line, 0, ly);
    });

    ctx.restore();
  }, []);

  // Draw stickers
  const drawStickers = useCallback((ctx: CanvasRenderingContext2D, frame: FrameImage, progress: number, w: number, h: number) => {
    frame.stickers.forEach(sticker => {
      const x = (sticker.x / 100) * w;
      const y = (sticker.y / 100) * h;
      const size = sticker.size * (w / 640);

      ctx.save();

      let alpha = 1;
      let offsetY = 0;

      switch (sticker.animation) {
        case 'fade-in': alpha = easeInOut(Math.min(progress * 3, 1)); break;
        case 'slide-up': offsetY = (1 - easeInOut(Math.min(progress * 3, 1))) * size * 1.5; break;
        case 'bounce': { const bt = bounceEase(Math.min(progress * 2, 1)); offsetY = -(1 - bt) * size; break; }
      }

      ctx.translate(x, y + offsetY);

      // Advanced scaling and rotating entry animations for stickers
      if (sticker.animation === 'elastic') {
        const t = Math.min(progress * 2, 1);
        let scale = 1;
        if (t < 1) {
          scale = 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
          alpha = t;
        }
        ctx.scale(scale, scale);
      } else if (sticker.animation === 'spin-in') {
        const t = Math.min(progress * 2.5, 1);
        alpha = t;
        ctx.rotate((1 - t) * Math.PI * 2);
      } else if (sticker.animation === 'fade-zoom') {
        const t = Math.min(progress * 3, 1);
        alpha = t;
        ctx.scale(t, t);
      } else if (sticker.animation === 'rotate-3d') {
        const t = Math.min(progress * 2.5, 1);
        alpha = t;
        const scaleX = Math.abs(Math.cos((1 - t) * Math.PI));
        ctx.scale(scaleX, 1);
      }

      // Camera movement
      if (sticker.cameraMovement && sticker.cameraMovement !== 'none') {
        const t = easeInOut(progress);
        switch (sticker.cameraMovement) {
          case 'zoom-in': { const scale = 1 + t * 0.3; ctx.scale(scale, scale); break; }
          case 'zoom-out': { const scale = 1.3 - t * 0.3; ctx.scale(scale, scale); break; }
          case 'pan-left': ctx.translate(-t * w * 0.15, 0); break;
          case 'pan-right': ctx.translate(t * w * 0.15, 0); break;
          case 'pan-up': ctx.translate(0, -t * h * 0.15); break;
          case 'pan-down': ctx.translate(0, t * h * 0.15); break;
          case 'rotate-cw': ctx.rotate(t * 5 * (Math.PI / 180)); break;
          case 'rotate-ccw': ctx.rotate(-t * 5 * (Math.PI / 180)); break;
        }
      }

      // Static rotation
      if (sticker.rotation) {
        ctx.rotate(sticker.rotation * Math.PI / 180);
      }

      // Transition (Exit)
      if (sticker.transition && sticker.transition !== 'none') {
        const transWindow = frame.transitionDuration / frame.duration;
        if (progress >= (1 - transWindow) && transWindow > 0) {
          const tp = easeInOut((progress - (1 - transWindow)) / transWindow);
          switch (sticker.transition) {
            case 'crossfade': alpha *= (1 - tp); break;
            case 'slide-left': ctx.translate(-tp * w, 0); break;
            case 'slide-right': ctx.translate(tp * w, 0); break;
            case 'slide-up': ctx.translate(0, -tp * h); break;
            case 'slide-down': ctx.translate(0, tp * h); break;
          }
        }
      }

      ctx.globalAlpha = alpha;
      if (sticker.type === 'custom' && sticker.url) {
        let img = stickerImagesRef.current.get(sticker.id);
        if (!img) {
          img = new Image();
          img.src = sticker.url;
          stickerImagesRef.current.set(sticker.id, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
        }
      } else {
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji, 0, 0);
      }
      ctx.restore();
    });
  }, []);

  // Main render loop using refs to avoid stale closure issues
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    lastTimeRef.current = 0;

    const renderLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Time delta
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000 * globalSpeed;
      lastTimeRef.current = timestamp;

      // Advance frame progress
      let fp = frameProgressRef.current + delta;
      let cf = currentFrameRef.current;

      const frameDuration = frames[cf]?.duration || 1;
      if (fp >= frameDuration) {
        fp = 0;
        const prevCf = cf;
        cf = (cf + 1) % frames.length;
        
        // Loop back to start of audio if we wrapped around to frame 0
        if (cf === 0 && prevCf !== 0 && audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        
        currentFrameRef.current = cf;
        setCurrentFrame(cf);
      }
      frameProgressRef.current = fp;

      // Play frame SFX if present and not triggered yet for this frame
      const frame = frames[cf];
      if (frame && frame.sfx && lastSfxFrameRef.current !== cf) {
        lastSfxFrameRef.current = cf;
        const sfxAudio = new Audio(frame.sfx.url);
        sfxAudio.volume = frame.sfx.volume;
        sfxAudio.playbackRate = globalSpeed;
        sfxAudio.currentTime = frame.sfx.start || 0;
        
        const endLimit = frame.sfx.end;
        const onTimeUpdate = () => {
          if (sfxAudio.currentTime >= endLimit) {
            sfxAudio.pause();
            sfxAudio.removeEventListener('timeupdate', onTimeUpdate);
          }
        };
        sfxAudio.addEventListener('timeupdate', onTimeUpdate);
        sfxAudio.play().catch(e => console.log("SFX play failed:", e));
      }

      if (onTimeUpdate) {
        let currentTime = 0;
        for (let i = 0; i < cf; i++) {
          currentTime += frames[i].duration;
        }
        currentTime += fp;
        onTimeUpdate(currentTime);
      }

      const progress = fp / frameDuration;
      const img = imagesRef.current.get(frame.id);

      // Clear
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      if (!img || !img.complete) {
        animRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Try transitions first
      const nextFrame = frames[(cf + 1) % frames.length];
      const nextImg = nextFrame ? imagesRef.current.get(nextFrame.id) || null : null;

      ctx.save();
      const transitionApplied = applyTransition(ctx, img, nextImg, frame, nextFrame?.filter, progress, w, h);
      ctx.restore();

      if (!transitionApplied) {
        // Apply animation then draw image with crop
        ctx.save();
        applyAnimation(ctx, frame, progress, w, h);
        applyCropAndDraw(ctx, img, frame, w, h);
        ctx.restore();
      }

      // Draw drawings / shapes from cache
      const cachedDrawings = drawingsCacheRef.current.get(frame.id);
      if (cachedDrawings) {
        ctx.drawImage(cachedDrawings, 0, 0, w, h);
      }

      // Draw overlays
      drawText(ctx, frame, progress, w, h);
      drawStickers(ctx, frame, progress, w, h);

      // Draw global watermark
      if (watermarkText) {
        ctx.save();
        ctx.font = 'bold 16px sans-serif';
        const opacity = watermarkOpacity ?? 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.lineWidth = 2;

        const padding = 16;
        const text = watermarkText;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = 16;

        let x = padding;
        let y = padding + textHeight;

        if (watermarkPosition === 'top-right') {
          x = w - textWidth - padding;
        } else if (watermarkPosition === 'bottom-left') {
          y = h - padding;
        } else if (watermarkPosition === 'bottom-right') {
          x = w - textWidth - padding;
          y = h - padding;
        }

        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(renderLoop);
    };

    animRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, frames, globalSpeed, applyAnimation, applyTransition, drawText, drawStickers, isMinimized]);

  // Draw static frame when not playing
  useEffect(() => {
    if (isPlaying || frames.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = frames[currentFrame];
    if (!frame) return;
    const img = imagesRef.current.get(frame.id);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      if (img && img.complete) {
        applyCropAndDraw(ctx, img, frame, w, h);
        drawText(ctx, frame, 1, w, h);
        drawStickers(ctx, frame, 1, w, h);
      }
    };

    if (img?.complete) {
      draw();
    } else if (img) {
      img.onload = draw;
    }
  }, [isPlaying, currentFrame, frames, drawText, drawStickers, isMinimized]);

  const goToFrame = (index: number) => {
    const clamped = Math.max(0, Math.min(frames.length - 1, index));
    setCurrentFrame(clamped);
    currentFrameRef.current = clamped;
    frameProgressRef.current = 0;
    
    if (onTimeUpdate) {
      let currentTime = 0;
      for (let i = 0; i < clamped; i++) {
        currentTime += frames[i].duration;
      }
      onTimeUpdate(currentTime);
    }
  };

  if (frames.length === 0) return null;

  const floatingStyle: React.CSSProperties = isFloating
    ? isMobile
      ? {
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92vw',
          zIndex: 50,
          margin: 0,
        }
      : {
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '680px',
          zIndex: 50,
          margin: 0,
        }
    : {};

  return (
    <div
      style={floatingStyle}
      className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl shadow-black/40 ${
        isFloating
          ? 'shadow-2xl shadow-black/70 border-cta/30 ring-1 ring-cta/10 backdrop-blur-md bg-dark-card/95'
          : ''
      }`}
    >
      {/* Header (Acts as drag handle if floating on desktop) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`p-4 border-b border-dark-border flex items-center justify-between select-none ${
          isFloating && !isMobile ? 'cursor-grab active:cursor-grabbing hover:bg-dark-border/10' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {isFloating && !isMobile && <GripHorizontal size={18} className="text-gray-500" />}
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Play size={18} className="text-cta" />
            Vista Previa
            {isFloating && <span className="text-xs text-gray-500 font-normal">({isMobile ? 'Flotante' : 'Arrastrable'})</span>}
          </h3>
        </div>

        {/* Floating Controls Header */}
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {/* Play/Pause icon shown only when minimized */}
          {isMinimized && (
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) lastTimeRef.current = 0;
              }}
              title={isPlaying ? "Pausar" : "Reproducir"}
              className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                isPlaying ? 'text-cta hover:bg-cta/10' : 'text-gray-400 hover:text-light hover:bg-dark-bg'
              }`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}

          {/* Reset position button */}
          {isFloating && !isMobile && (
            <button
              onClick={resetPosition}
              title="Restablecer posición"
              className="p-1.5 rounded-lg text-gray-400 hover:text-light hover:bg-dark-bg transition-all duration-200 cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
          )}

          {/* Pin/Unpin float button */}
          <button
            onClick={() => setIsFloating(!isFloating)}
            title={isFloating ? "Acoplar a la cuadrícula" : "Hacer ventana flotante"}
            className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              isFloating
                ? 'text-cta hover:bg-cta/10'
                : 'text-gray-400 hover:text-light hover:bg-dark-bg'
            }`}
          >
            {isFloating ? <PinOff size={16} /> : <Pin size={16} />}
          </button>

          {/* Minimize/Maximize button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Maximizar reproductor" : "Minimizar reproductor"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-light hover:bg-dark-bg transition-all duration-200 cursor-pointer"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      {!isMinimized && (
        <div className="relative bg-black flex items-center justify-center p-4">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full max-w-[640px] rounded-lg border border-dark-border/50"
          />
        </div>
      )}

      {/* Controls */}
      {!isMinimized && (
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-dark-border/20">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={() => goToFrame(currentFrame - 1)}
              disabled={frames.length <= 1}
              className="p-2 rounded-lg bg-dark-bg border border-dark-border text-gray-400 hover:text-light transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) {
                  lastTimeRef.current = 0;
                }
              }}
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-cta text-white shadow-lg shadow-cta/30'
                  : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-light hover:border-cta/50'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={() => goToFrame(currentFrame + 1)}
              disabled={frames.length <= 1}
              className="p-2 rounded-lg bg-dark-bg border border-dark-border text-gray-400 hover:text-light transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Frame indicator */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Frame <span className="text-cta font-mono font-medium">{currentFrame + 1}</span> / {frames.length}
            </span>
            <div className="flex gap-1 overflow-x-auto custom-scrollbar max-w-full sm:max-w-[200px] pb-1 sm:pb-0 scroll-smooth">
              {frames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToFrame(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    i === currentFrame ? 'bg-cta scale-125' : 'bg-dark-border hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
