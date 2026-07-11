import { useEffect, useRef, useCallback, useState } from 'react';
import type { FrameImage, CropSettings, TextOverlay, StickerOverlay } from '../types';

/**
 * Animated canvas that renders a single frame in a loop,
 * showing all effects: animation, transition, crop, text (with animations), and stickers (with animations).
 * Used inside editor modals for a live preview.
 */

// ── Easing Helpers ───────────────────────────────────────────
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

// ── Drawing Helpers ──────────────────────────────────────────
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  if (!img.naturalWidth) return;
  const ratio = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * ratio;
  const h = img.naturalHeight * ratio;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

function buildCropPath(ctx: CanvasRenderingContext2D, crop: CropSettings, cw: number, ch: number) {
  const m = crop.margin;
  const p = crop.padding;
  const offset = m + p;
  const x = offset, y = offset;
  const w = cw - offset * 2, h = ch - offset * 2;
  if (w <= 0 || h <= 0) return;

  ctx.beginPath();
  switch (crop.shape) {
    case 'rectangle': case 'inset': {
      const cr = Math.min(crop.cornerRadius, w / 2, h / 2);
      const iT = (crop.insetTop / 100) * h, iR = (crop.insetRight / 100) * w;
      const iB = (crop.insetBottom / 100) * h, iL = (crop.insetLeft / 100) * w;
      const rw = w - iL - iR, rh = h - iT - iB;
      if (rw <= 0 || rh <= 0) return;
      ctx.roundRect(x + iL, y + iT, rw, rh, cr);
      break;
    }
    case 'rounded': {
      const cr = Math.min(Math.max(crop.cornerRadius, 8), w / 2, h / 2);
      ctx.roundRect(x, y, w, h, cr);
      break;
    }
    case 'circle': { const r = Math.min(w, h) / 2; ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2); break; }
    case 'ellipse': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
    case 'diamond': {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.moveTo(cx, y); ctx.lineTo(x + w, cy); ctx.lineTo(cx, y + h); ctx.lineTo(x, cy); ctx.closePath();
      break;
    }
    case 'hexagon': case 'octagon': case 'pentagon': {
      const sides = crop.shape === 'hexagon' ? 6 : crop.shape === 'octagon' ? 8 : 5;
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
      const sa = crop.shape === 'hexagon' ? -Math.PI / 6 : crop.shape === 'octagon' ? -Math.PI / 8 : -Math.PI / 2;
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 / sides) * i + sa;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    }
    case 'star': {
      const cx = x + w / 2, cy = y + h / 2, outerR = Math.min(w, h) / 2, innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    }
    case 'heart': {
      const cx = x + w / 2, topY = y + h * 0.3, bottomY = y + h * 0.9;
      ctx.moveTo(cx, bottomY);
      ctx.bezierCurveTo(x - w * 0.05, y + h * 0.55, x - w * 0.05, topY - h * 0.15, cx, topY);
      ctx.bezierCurveTo(x + w * 1.05, topY - h * 0.15, x + w * 1.05, y + h * 0.55, cx, bottomY);
      ctx.closePath(); break;
    }
    case 'triangle': {
      const cx = x + w / 2;
      ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    }
    case 'freeform': {
      const pts = crop.freeformPoints;
      if (pts && pts.length >= 3) {
        pts.forEach((pt, i) => {
          const px = x + (pt.x / 100) * w, py = y + (pt.y / 100) * h;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
      } else { ctx.rect(x, y, w, h); }
      break;
    }
    default: ctx.rect(x, y, w, h);
  }
}

function getCanvasFilter(filter: string | undefined): string {
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

function applyCropAndDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, crop: CropSettings | undefined, cw: number, ch: number, filter?: string) {
  if (filter && filter !== 'none') {
    ctx.filter = getCanvasFilter(filter);
  }

  if (!crop || crop.shape === 'none') {
    drawImageCover(ctx, img, cw, ch);
    ctx.filter = 'none';
    return;
  }
  ctx.save();
  buildCropPath(ctx, crop, cw, ch);
  ctx.clip();
  drawImageCover(ctx, img, cw, ch);
  ctx.restore();

  ctx.filter = 'none';

  if (crop.borderWidth > 0) {
    ctx.save();
    buildCropPath(ctx, crop, cw, ch);
    ctx.lineWidth = crop.borderWidth;
    ctx.strokeStyle = crop.borderColor;
    ctx.stroke();
    ctx.restore();
  }
}

function applyAnimation(ctx: CanvasRenderingContext2D, animation: string, progress: number, w: number, h: number) {
  const t = easeInOut(progress);
  switch (animation) {
    case 'zoom-in': { const s = 1 + t * 0.3; ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2); break; }
    case 'zoom-out': { const s = 1.3 - t * 0.3; ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2); break; }
    case 'pan-left': ctx.translate(-t * w * 0.15, 0); break;
    case 'pan-right': ctx.translate(t * w * 0.15, 0); break;
    case 'pan-up': ctx.translate(0, -t * h * 0.15); break;
    case 'pan-down': ctx.translate(0, t * h * 0.15); break;
    case 'fade-in': ctx.globalAlpha = t; break;
    case 'fade-out': ctx.globalAlpha = 1 - t * 0.8; break;
    case 'rotate-cw': { const a = t * 5 * (Math.PI / 180); ctx.translate(w / 2, h / 2); ctx.rotate(a); ctx.translate(-w / 2, -h / 2); break; }
    case 'rotate-ccw': { const a = -t * 5 * (Math.PI / 180); ctx.translate(w / 2, h / 2); ctx.rotate(a); ctx.translate(-w / 2, -h / 2); break; }
    case 'parallax': {
      const off = (t - 0.5) * w * 0.1; ctx.translate(off, 0);
      const s = 1 + Math.abs(t - 0.5) * 0.1; ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
      break;
    }
    case 'bounce': {
      const b = bounceEase(progress);
      ctx.translate(0, -Math.abs(Math.sin(b * Math.PI * 2)) * h * 0.05);
      break;
    }
  }
}

function drawText(ctx: CanvasRenderingContext2D, txt: TextOverlay | undefined, progress: number, w: number, h: number, duration: number, transitionDuration: number) {
  if (!txt || !txt.content.trim()) return;

  const x = (txt.x / 100) * w;
  const y = (txt.y / 100) * h;
  const fontSize = txt.fontSize * (w / 640);

  ctx.save();

  let alpha = 1;
  let offsetY = 0;
  let displayText = txt.content;

  switch (txt.animation) {
    case 'fade-in': alpha = easeInOut(Math.min(progress * 3, 1)); break;
    case 'slide-up': offsetY = (1 - easeInOut(Math.min(progress * 3, 1))) * fontSize * 1.5; break;
    case 'bounce': { const bt = bounceEase(Math.min(progress * 2, 1)); offsetY = -(1 - bt) * fontSize; break; }
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
      case 'zoom-in': { const s = 1 + t * 0.3; ctx.scale(s, s); break; }
      case 'zoom-out': { const s = 1.3 - t * 0.3; ctx.scale(s, s); break; }
      case 'pan-left': ctx.translate(-t * w * 0.15, 0); break;
      case 'pan-right': ctx.translate(t * w * 0.15, 0); break;
      case 'pan-up': ctx.translate(0, -t * h * 0.15); break;
      case 'pan-down': ctx.translate(0, t * h * 0.15); break;
      case 'rotate-cw': ctx.rotate(t * 5 * (Math.PI / 180)); break;
      case 'rotate-ccw': ctx.rotate(-t * 5 * (Math.PI / 180)); break;
    }
  }

  if (txt.rotation) ctx.rotate(txt.rotation * Math.PI / 180);

  // Transition (Exit)
  if (txt.transition && txt.transition !== 'none') {
    const transWindow = transitionDuration / duration;
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
  ctx.shadowColor = txt.shadowColor;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = txt.color;
  ctx.fillText(displayText, 0, 0);
  ctx.restore();
}

function drawStickers(ctx: CanvasRenderingContext2D, stickers: StickerOverlay[], progress: number, w: number, h: number, duration: number, transitionDuration: number) {
  stickers.forEach(sticker => {
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
        case 'zoom-in': { const s = 1 + t * 0.3; ctx.scale(s, s); break; }
        case 'zoom-out': { const s = 1.3 - t * 0.3; ctx.scale(s, s); break; }
        case 'pan-left': ctx.translate(-t * w * 0.15, 0); break;
        case 'pan-right': ctx.translate(t * w * 0.15, 0); break;
        case 'pan-up': ctx.translate(0, -t * h * 0.15); break;
        case 'pan-down': ctx.translate(0, t * h * 0.15); break;
        case 'rotate-cw': ctx.rotate(t * 5 * (Math.PI / 180)); break;
        case 'rotate-ccw': ctx.rotate(-t * 5 * (Math.PI / 180)); break;
      }
    }

    if (sticker.rotation) ctx.rotate(sticker.rotation * Math.PI / 180);

    // Transition (Exit)
    if (sticker.transition && sticker.transition !== 'none') {
      const transWindow = transitionDuration / duration;
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
}

// ── Component ────────────────────────────────────────────────

interface FramePreviewCanvasProps {
  frame: FrameImage;
  /** Override crop for live preview while editing */
  cropOverride?: CropSettings;
  /** Override text for live preview while editing */
  textOverride?: TextOverlay;
  /** Override stickers for live preview while editing */
  stickersOverride?: StickerOverlay[];
  className?: string;
  onTextChange?: (text: TextOverlay | undefined) => void;
  onStickersChange?: (stickers: StickerOverlay[]) => void;
}

export function FramePreviewCanvas({
  frame,
  cropOverride,
  textOverride,
  stickersOverride,
  className = '',
  onTextChange,
  onStickersChange,
}: FramePreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const isDraggingRef = useRef<boolean>(false);
  const dragTargetRef = useRef<{ type: 'text' | 'sticker'; id?: string } | null>(null);
  const activeGuidesRef = useRef<{ x?: number; y?: number }>({});
  const [cursorStyle, setCursorStyle] = useState<'default' | 'grab' | 'grabbing'>('default');

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = frame.previewUrl;
    img.onload = () => { imgRef.current = img; };
    return () => { imgRef.current = null; };
  }, [frame.previewUrl]);

  const checkHoverTarget = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const text = textOverride !== undefined ? textOverride : frame.text;
    const stickers = stickersOverride !== undefined ? stickersOverride : frame.stickers;

    let isOverAny = false;

    if (text && text.content.trim()) {
      const tx = (text.x / 100) * canvas.width;
      const ty = (text.y / 100) * canvas.height;
      const fontSize = text.fontSize * (canvas.width / 640);
      const textWidth = text.content.length * fontSize * 0.6;
      const halfW = textWidth / 2;
      const halfH = fontSize / 2;

      if (Math.abs(mx - tx) <= Math.max(halfW, 40) && Math.abs(my - ty) <= Math.max(halfH, 20)) {
        isOverAny = true;
      }
    }

    if (!isOverAny && stickers && stickers.length > 0) {
      for (const sticker of stickers) {
        const sx = (sticker.x / 100) * canvas.width;
        const sy = (sticker.y / 100) * canvas.height;
        const size = sticker.size * (canvas.width / 640);
        const halfSize = size / 2;

        if (Math.abs(mx - sx) <= Math.max(halfSize, 25) && Math.abs(my - sy) <= Math.max(halfSize, 25)) {
          isOverAny = true;
          break;
        }
      }
    }

    setCursorStyle(isOverAny ? 'grab' : 'default');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const text = textOverride !== undefined ? textOverride : frame.text;
    const stickers = stickersOverride !== undefined ? stickersOverride : frame.stickers;

    // Check if clicked text
    if (text && text.content.trim()) {
      const tx = (text.x / 100) * canvas.width;
      const ty = (text.y / 100) * canvas.height;
      const fontSize = text.fontSize * (canvas.width / 640);
      const textWidth = text.content.length * fontSize * 0.6;
      const halfW = textWidth / 2;
      const halfH = fontSize / 2;

      if (Math.abs(mx - tx) <= Math.max(halfW, 40) && Math.abs(my - ty) <= Math.max(halfH, 20)) {
        isDraggingRef.current = true;
        dragTargetRef.current = { type: 'text' };
        setCursorStyle('grabbing');
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    // Check if clicked any sticker
    if (stickers && stickers.length > 0) {
      for (let i = stickers.length - 1; i >= 0; i--) {
        const sticker = stickers[i];
        const sx = (sticker.x / 100) * canvas.width;
        const sy = (sticker.y / 100) * canvas.height;
        const size = sticker.size * (canvas.width / 640);
        const halfSize = size / 2;

        if (Math.abs(mx - sx) <= Math.max(halfSize, 25) && Math.abs(my - sy) <= Math.max(halfSize, 25)) {
          isDraggingRef.current = true;
          dragTargetRef.current = { type: 'sticker', id: sticker.id };
          setCursorStyle('grabbing');
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    checkHoverTarget(e);

    if (!isDraggingRef.current || !dragTargetRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Convert to percentage
    const rawXPct = (mx / canvas.width) * 100;
    const rawYPct = (my / canvas.height) * 100;

    // Snapping points (Left 10%, Center 50%, Right 90%)
    const snapXPoints = [10, 50, 90];
    const snapYPoints = [10, 50, 90];
    const threshold = 2.5; // percent

    let snapX = rawXPct;
    let isSnappedX = false;
    let snappedPointX = 0;

    for (const p of snapXPoints) {
      if (Math.abs(rawXPct - p) <= threshold) {
        snapX = p;
        isSnappedX = true;
        snappedPointX = p;
        break;
      }
    }

    let snapY = rawYPct;
    let isSnappedY = false;
    let snappedPointY = 0;

    for (const p of snapYPoints) {
      if (Math.abs(rawYPct - p) <= threshold) {
        snapY = p;
        isSnappedY = true;
        snappedPointY = p;
        break;
      }
    }

    const finalX = Math.max(0, Math.min(100, parseFloat(snapX.toFixed(1))));
    const finalY = Math.max(0, Math.min(100, parseFloat(snapY.toFixed(1))));

    activeGuidesRef.current = {
      x: isSnappedX ? snappedPointX : undefined,
      y: isSnappedY ? snappedPointY : undefined,
    };

    if (dragTargetRef.current.type === 'text') {
      const text = textOverride !== undefined ? textOverride : frame.text;
      if (text && onTextChange) {
        onTextChange({ ...text, x: finalX, y: finalY });
      }
    } else if (dragTargetRef.current.type === 'sticker' && dragTargetRef.current.id) {
      const stickers = stickersOverride !== undefined ? stickersOverride : frame.stickers;
      if (stickers && onStickersChange) {
        const nextStickers = stickers.map(s =>
          s.id === dragTargetRef.current!.id ? { ...s, x: finalX, y: finalY } : s
        );
        onStickersChange(nextStickers);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    dragTargetRef.current = null;
    activeGuidesRef.current = {};
    setCursorStyle('default');
    
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = frame.previewUrl;
    img.onload = () => { imgRef.current = img; };
    return () => { imgRef.current = null; };
  }, [frame.previewUrl]);

  // Animated render loop
  const renderLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;

    const w = canvas.width;
    const h = canvas.height;

    if (!startTimeRef.current) startTimeRef.current = timestamp;

    // Loop the frame duration (use 2s default for preview if very short)
    const loopDuration = Math.max(frame.duration, 1.5) * 1000;
    const elapsed = (timestamp - startTimeRef.current) % loopDuration;
    const progress = elapsed / loopDuration;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    if (!img || !img.complete || !img.naturalWidth) {
      animRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const crop = cropOverride !== undefined ? cropOverride : frame.crop;
    const text = textOverride !== undefined ? textOverride : frame.text;
    const stickers = stickersOverride !== undefined ? stickersOverride : frame.stickers;

    // Apply frame-level animation + crop
    ctx.save();
    applyAnimation(ctx, frame.animation, progress, w, h);
    applyCropAndDraw(ctx, img, crop, w, h, frame.filter);
    ctx.restore();

    // Draw text with animations
    drawText(ctx, text, progress, w, h, frame.duration, frame.transitionDuration);

    // Draw stickers with animations
    drawStickers(ctx, stickers || [], progress, w, h, frame.duration, frame.transitionDuration);

    // Draw guide lines
    if (activeGuidesRef.current.x !== undefined) {
      ctx.save();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      const gx = (activeGuidesRef.current.x / 100) * w;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
      ctx.restore();
    }
    if (activeGuidesRef.current.y !== undefined) {
      ctx.save();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      const gy = (activeGuidesRef.current.y / 100) * h;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
      ctx.restore();
    }

    // Progress bar at bottom
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, h - 3, w, 3);
    ctx.fillStyle = 'rgba(16,185,129,0.6)';
    ctx.fillRect(0, h - 3, w * progress, 3);
    ctx.restore();

    animRef.current = requestAnimationFrame(renderLoop);
  }, [frame, cropOverride, textOverride, stickersOverride]);

  useEffect(() => {
    startTimeRef.current = 0;
    animRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [renderLoop]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: cursorStyle }}
      className={`w-full rounded-lg border border-dark-border/50 shadow-inner select-none touch-none ${className}`}
    />
  );
}
