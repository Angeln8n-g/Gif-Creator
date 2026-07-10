import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { FrameImage, CropSettings } from '../types';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

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

// Apply crop clipping and draw border around the clipped area
function applyCropAndDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: FrameImage,
  cw: number,
  ch: number
) {
  const crop = frame.crop;
  if (!crop || crop.shape === 'none') {
    drawImageCover(ctx, img, cw, ch);
    return;
  }

  // Draw background (margin area stays black)
  ctx.save();
  buildCropPath(ctx, crop, cw, ch);
  ctx.clip();
  drawImageCover(ctx, img, cw, ch);
  ctx.restore();

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
  audioVolume = 1
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
  const frameProgressRef = useRef(0);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
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
    progress: number,
    w: number,
    h: number
  ) => {
    if (!nextImg || frame.transition === 'none' || progress < (1 - frame.transitionDuration / frame.duration)) {
      return false; // No transition active
    }

    // Compute transition progress: 0..1 within the transition window
    const transWindow = frame.transitionDuration / frame.duration;
    const tp = easeInOut((progress - (1 - transWindow)) / transWindow);

    switch (frame.transition) {
      case 'crossfade':
        ctx.globalAlpha = 1 - tp;
        drawImageCover(ctx, currentImg, w, h);
        ctx.globalAlpha = tp;
        drawImageCover(ctx, nextImg, w, h);
        ctx.globalAlpha = 1;
        return true;

      case 'slide-left':
        ctx.save();
        ctx.translate(-tp * w, 0);
        drawImageCover(ctx, currentImg, w, h);
        ctx.translate(w, 0);
        drawImageCover(ctx, nextImg, w, h);
        ctx.restore();
        return true;

      case 'slide-right':
        ctx.save();
        ctx.translate(tp * w, 0);
        drawImageCover(ctx, currentImg, w, h);
        ctx.translate(-w, 0);
        drawImageCover(ctx, nextImg, w, h);
        ctx.restore();
        return true;

      case 'slide-up':
        ctx.save();
        ctx.translate(0, -tp * h);
        drawImageCover(ctx, currentImg, w, h);
        ctx.translate(0, h);
        drawImageCover(ctx, nextImg, w, h);
        ctx.restore();
        return true;

      case 'slide-down':
        ctx.save();
        ctx.translate(0, tp * h);
        drawImageCover(ctx, currentImg, w, h);
        ctx.translate(0, -h);
        drawImageCover(ctx, nextImg, w, h);
        ctx.restore();
        return true;

      case 'wipe-left':
        drawImageCover(ctx, currentImg, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, tp * w, h);
        ctx.clip();
        drawImageCover(ctx, nextImg, w, h);
        ctx.restore();
        return true;

      case 'wipe-right':
        drawImageCover(ctx, currentImg, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(w - tp * w, 0, tp * w, h);
        ctx.clip();
        drawImageCover(ctx, nextImg, w, h);
        ctx.restore();
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
    }

    ctx.translate(x, y + offsetY);

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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Shadow
    ctx.shadowColor = txt.shadowColor;
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = txt.color;
    ctx.fillText(displayText, 0, 0);
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
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.emoji, 0, 0);
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
      const transitionApplied = applyTransition(ctx, img, nextImg, frame, progress, w, h);
      ctx.restore();

      if (!transitionApplied) {
        // Apply animation then draw image with crop
        ctx.save();
        applyAnimation(ctx, frame, progress, w, h);
        applyCropAndDraw(ctx, img, frame, w, h);
        ctx.restore();
      }

      // Draw overlays
      drawText(ctx, frame, progress, w, h);
      drawStickers(ctx, frame, progress, w, h);

      animRef.current = requestAnimationFrame(renderLoop);
    };

    animRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, frames, globalSpeed, applyAnimation, applyTransition, drawText, drawStickers]);

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
  }, [isPlaying, currentFrame, frames, drawText, drawStickers]);

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

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl shadow-black/40">
      <div className="p-4 border-b border-dark-border">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Play size={18} className="text-cta" />
          Vista Previa
        </h3>
      </div>

      {/* Canvas */}
      <div className="relative bg-black flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full max-w-[640px] rounded-lg border border-dark-border/50"
        />
      </div>

      {/* Controls */}
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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
    </div>
  );
});
