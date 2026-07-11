import { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import type { FrameImage, RenderSettings, CropSettings, TextOverlay, StickerOverlay } from '../types';

// Helper function to fetch resources with progress tracking
async function fetchWithProgress(
  url: string,
  mimeType: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: HTTP status ${response.status}`);

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || total === 0) {
    onProgress(100);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  const reader = response.body.getReader();

  let loaded = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress(Math.round((loaded / total) * 100));
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function useFFmpeg() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setLoadProgress(0);
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    });

    try {
      // ffmpeg-core.js is small (31KB), load it directly
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      
      // ffmpeg-core.wasm is large (24MB), download with progress
      const wasmURL = await fetchWithProgress(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm',
        (pct) => setLoadProgress(pct)
      );

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });
      
      setLoaded(true);
    } catch (e) {
      console.error("Error loading FFmpeg:", e);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (mounted) await load();
    };
    init();
    return () => { mounted = false; };
  }, [load]);

  // ─── Crop Path Builder (mirrors PreviewPlayer / FramePreviewCanvas) ───
  const buildCropPath = (
    ctx: OffscreenCanvasRenderingContext2D,
    crop: CropSettings,
    cw: number,
    ch: number
  ) => {
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
  };

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

  // Render frames to canvas for animation effects, then extract as image files
  const renderFrameToCanvas = async (
    frame: FrameImage,
    width: number,
    height: number,
    subFrameIndex: number,
    totalSubFrames: number,
    nextFrame?: FrameImage,
    watermark?: { text?: string; opacity?: number; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }
  ): Promise<Blob> => {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // Load image
    const img = await createImageBitmap(frame.file);
    const progress = totalSubFrames > 1 ? subFrameIndex / (totalSubFrames - 1) : 0;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // ── Apply frame-level animation ──
    ctx.save();
    const t = easeInOut(progress);

    switch (frame.animation) {
      case 'zoom-in': {
        const scale = 1 + t * 0.3;
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2, -height / 2);
        break;
      }
      case 'zoom-out': {
        const scale = 1.3 - t * 0.3;
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2, -height / 2);
        break;
      }
      case 'pan-left': ctx.translate(-t * width * 0.15, 0); break;
      case 'pan-right': ctx.translate(t * width * 0.15, 0); break;
      case 'pan-up': ctx.translate(0, -t * height * 0.15); break;
      case 'pan-down': ctx.translate(0, t * height * 0.15); break;
      case 'fade-in': ctx.globalAlpha = t; break;
      case 'fade-out': ctx.globalAlpha = 1 - t * 0.8; break;
      case 'rotate-cw': {
        const angle = t * 5 * (Math.PI / 180);
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);
        ctx.translate(-width / 2, -height / 2);
        break;
      }
      case 'rotate-ccw': {
        const angle = -t * 5 * (Math.PI / 180);
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);
        ctx.translate(-width / 2, -height / 2);
        break;
      }
      case 'parallax': {
        const offset = (t - 0.5) * width * 0.1;
        ctx.translate(offset, 0);
        const pScale = 1 + Math.abs(t - 0.5) * 0.1;
        ctx.translate(width / 2, height / 2);
        ctx.scale(pScale, pScale);
        ctx.translate(-width / 2, -height / 2);
        break;
      }
      case 'bounce': {
        const b = bounceEase(progress);
        const offsetY = -Math.abs(Math.sin(b * Math.PI * 2)) * height * 0.05;
        ctx.translate(0, offsetY);
        break;
      }
    }

    // Helper to draw image with filter
    const drawImageWithFilter = (ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap, filterStr: string | undefined, w: number, h: number) => {
      if (filterStr && filterStr !== 'none') {
        ctx.filter = getCanvasFilter(filterStr);
      }
      drawImageCover(ctx, image, w, h);
      ctx.filter = 'none';
    };

    const transWindow = frame.transitionDuration / frame.duration;
    const isTransitioning = nextFrame && frame.transition !== 'none' && progress >= (1 - transWindow);

    if (isTransitioning && nextFrame) {
      // Draw transition blending
      const nextImg = await createImageBitmap(nextFrame.file);
      const tp = easeInOut((progress - (1 - transWindow)) / transWindow);
      const w = width;
      const h = height;

      switch (frame.transition) {
        case 'crossfade':
          ctx.globalAlpha = 1 - tp;
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.globalAlpha = tp;
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.globalAlpha = 1;
          break;
        case 'slide-left':
          ctx.save();
          ctx.translate(-tp * w, 0);
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.translate(w, 0);
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'slide-right':
          ctx.save();
          ctx.translate(tp * w, 0);
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.translate(-w, 0);
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'slide-up':
          ctx.save();
          ctx.translate(0, -tp * h);
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.translate(0, h);
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'slide-down':
          ctx.save();
          ctx.translate(0, tp * h);
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.translate(0, -h);
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'wipe-left':
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, tp * w, h);
          ctx.clip();
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'wipe-right':
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(w - tp * w, 0, tp * w, h);
          ctx.clip();
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'wipe-up':
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, h - tp * h, w, tp * h);
          ctx.clip();
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'wipe-down':
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, w, tp * h);
          ctx.clip();
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          break;
        case 'fade-black':
          if (tp < 0.5) {
            ctx.globalAlpha = 1 - tp * 2;
            drawImageWithFilter(ctx, img, frame.filter, w, h);
          } else {
            ctx.globalAlpha = (tp - 0.5) * 2;
            drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          }
          ctx.globalAlpha = 1;
          break;
        case 'fade-white':
          if (tp < 0.5) {
            ctx.globalAlpha = 1 - tp * 2;
            drawImageWithFilter(ctx, img, frame.filter, w, h);
            ctx.fillStyle = `rgba(255, 255, 255, ${tp * 2})`;
            ctx.fillRect(0, 0, w, h);
          } else {
            ctx.globalAlpha = (tp - 0.5) * 2;
            drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
            ctx.fillStyle = `rgba(255, 255, 255, ${(1 - tp) * 2})`;
            ctx.fillRect(0, 0, w, h);
          }
          ctx.globalAlpha = 1;
          break;
        case 'zoom-in':
          ctx.save();
          ctx.globalAlpha = 1 - tp;
          ctx.translate(w / 2, h / 2);
          const scaleC = 1 + tp * 0.5;
          ctx.scale(scaleC, scaleC);
          ctx.translate(-w / 2, -h / 2);
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = tp;
          ctx.translate(w / 2, h / 2);
          const scaleN = 0.5 + tp * 0.5;
          ctx.scale(scaleN, scaleN);
          ctx.translate(-w / 2, -h / 2);
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          ctx.globalAlpha = 1;
          break;
        case 'zoom-out':
          ctx.save();
          ctx.globalAlpha = 1 - tp;
          ctx.translate(w / 2, h / 2);
          const scaleCOut = 1 - tp * 0.3;
          ctx.scale(scaleCOut, scaleCOut);
          ctx.translate(-w / 2, -h / 2);
          drawImageWithFilter(ctx, img, frame.filter, w, h);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = tp;
          ctx.translate(w / 2, h / 2);
          const scaleNOut = 1.5 - tp * 0.5;
          ctx.scale(scaleNOut, scaleNOut);
          ctx.translate(-w / 2, -h / 2);
          drawImageWithFilter(ctx, nextImg, nextFrame.filter, w, h);
          ctx.restore();
          ctx.globalAlpha = 1;
          break;
        default:
          drawImageWithFilter(ctx, img, frame.filter, w, h);
      }
    } else {
      // Normal draw (with filter + crop if any)
      if (frame.filter && frame.filter !== 'none') {
        ctx.filter = getCanvasFilter(frame.filter);
      }

      if (frame.crop && frame.crop.shape !== 'none') {
        ctx.save();
        buildCropPath(ctx, frame.crop, width, height);
        ctx.clip();
        drawImageCover(ctx, img, width, height);
        ctx.restore();

        ctx.filter = 'none';

        if (frame.crop.borderWidth > 0) {
          ctx.save();
          buildCropPath(ctx, frame.crop, width, height);
          ctx.lineWidth = frame.crop.borderWidth;
          ctx.strokeStyle = frame.crop.borderColor;
          ctx.stroke();
          ctx.restore();
        }
      } else {
        drawImageCover(ctx, img, width, height);
        ctx.filter = 'none';
      }
    }

    ctx.restore(); // End animation transform

    // ── Draw text overlay with full animations ──
    renderTextOverlay(ctx, frame.text, progress, width, height, frame.duration, frame.transitionDuration);

    // ── Draw stickers with full animations ──
    renderStickerOverlays(ctx, frame.stickers, progress, width, height, frame.duration, frame.transitionDuration);

    // ── Draw global watermark ──
    if (watermark && watermark.text) {
      ctx.save();
      ctx.font = 'bold 16px sans-serif';
      const opacity = watermark.opacity ?? 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.lineWidth = 2;

      const padding = 16;
      const text = watermark.text;
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = 16;

      let x = padding;
      let y = padding + textHeight;

      if (watermark.position === 'top-right') {
        x = width - textWidth - padding;
      } else if (watermark.position === 'bottom-left') {
        y = height - padding;
      } else if (watermark.position === 'bottom-right') {
        x = width - textWidth - padding;
        y = height - padding;
      }

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blob;
  };

  // ── Text rendering with all animation effects ──
  const renderTextOverlay = (
    ctx: OffscreenCanvasRenderingContext2D,
    txt: TextOverlay | undefined,
    progress: number,
    w: number,
    h: number,
    duration: number,
    transitionDuration: number
  ) => {
    if (!txt || !txt.content.trim()) return;

    const x = (txt.x / 100) * w;
    const y = (txt.y / 100) * h;
    const fontSize = txt.fontSize * (w / 640);

    ctx.save();

    let alpha = 1;
    let offsetY = 0;
    let displayText = txt.content;

    // Entry animation
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

    // Static rotation
    if (txt.rotation) {
      ctx.rotate(txt.rotation * Math.PI / 180);
    }

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
  };

  // ── Sticker rendering with all animation effects ──
  const renderStickerOverlays = (
    ctx: OffscreenCanvasRenderingContext2D,
    stickers: StickerOverlay[],
    progress: number,
    w: number,
    h: number,
    duration: number,
    transitionDuration: number
  ) => {
    stickers.forEach(sticker => {
      const x = (sticker.x / 100) * w;
      const y = (sticker.y / 100) * h;
      const size = sticker.size * (w / 640);

      ctx.save();

      let alpha = 1;
      let offsetY = 0;

      // Entry animation
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

      // Static rotation
      if (sticker.rotation) {
        ctx.rotate(sticker.rotation * Math.PI / 180);
      }

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
  };

  const renderMedia = async (
    frames: FrameImage[],
    settings: RenderSettings,
    audioTrack?: File | null,
    audioVolume?: number
  ): Promise<string | null> => {
    if (!loaded || frames.length === 0) return null;
    setRendering(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;
    
    try {
      // Determine output dimensions
      let outW = 1280, outH = 720;
      if (settings.resolution === '480p') { outW = 854; outH = 480; }
      else if (settings.resolution === '720p') { outW = 1280; outH = 720; }
      else if (settings.resolution === '1080p') { outW = 1920; outH = 1080; }
      else if (settings.resolution === 'custom' && settings.customWidth && settings.customHeight) {
        outW = settings.customWidth; outH = settings.customHeight;
      }
      // Ensure even dimensions (required for video encoding)
      outW = outW % 2 === 0 ? outW : outW + 1;
      outH = outH % 2 === 0 ? outH : outH + 1;

      const fps = 15;

      // Always use canvas rendering to capture ALL effects (crop, text, stickers, animations)
      let concatText = '';
      let fileIndex = 0;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const nextFrame = frames[(i + 1) % frames.length];
        const effectiveDuration = frame.duration / settings.globalSpeed;
        
        const hasEffects = frame.animation !== 'none'
          || (frame.filter !== 'none' && frame.filter !== undefined)
          || (frame.transition !== 'none' && nextFrame)
          || frame.stickers.length > 0
          || (frame.text?.content)
          || (frame.crop && frame.crop.shape !== 'none')
          || (settings.watermarkText !== undefined && settings.watermarkText !== '');

        if (hasEffects) {
          // Generate sub-frames to capture all animations
          const totalSubFrames = Math.max(2, Math.round(effectiveDuration * fps));
          const frameDuration = 1 / fps;

          for (let sf = 0; sf < totalSubFrames; sf++) {
            const blob = await renderFrameToCanvas(
              frame,
              outW,
              outH,
              sf,
              totalSubFrames,
              nextFrame,
              {
                text: settings.watermarkText,
                opacity: settings.watermarkOpacity,
                position: settings.watermarkPosition
              }
            );
            const data = new Uint8Array(await blob.arrayBuffer());
            const fname = `frame_${fileIndex}.png`;
            await ffmpeg.writeFile(fname, data);
            concatText += `file '${fname}'\n`;
            concatText += `duration ${frameDuration}\n`;
            fileIndex++;
          }
        } else {
          // Static frame with no effects at all – use original
          const fileData = await fetchFile(frame.file);
          const fname = `frame_${fileIndex}.png`;
          await ffmpeg.writeFile(fname, fileData);
          concatText += `file '${fname}'\n`;
          concatText += `duration ${effectiveDuration}\n`;
          fileIndex++;
        }

        setProgress(Math.round(((i + 1) / frames.length) * 40));
      }

      // Repeat last file for concat demuxer quirk
      concatText += `file 'frame_${fileIndex - 1}.png'\n`;
      await ffmpeg.writeFile('concat_list.txt', concatText);

      const outputName = `output.${settings.format}`;
      const scaleFilter = `scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2`;

      if (settings.format === 'gif') {
        const usePalette = settings.optimization !== 'none' || settings.gifColors !== undefined || settings.gifDither !== undefined;
        if (usePalette) {
          // Two-pass GIF with palette for better quality and smaller size
          const statsMode = settings.optimization === 'high' ? 'diff' : 'full';
          
          let dither = 'floyd_steinberg';
          if (settings.gifDither !== undefined) {
            dither = settings.gifDither === 'bayer' ? 'bayer:bayer_scale=3' : settings.gifDither;
          } else {
            dither = settings.optimization === 'high' ? 'bayer:bayer_scale=3' : 'floyd_steinberg';
          }

          const maxColors = settings.gifColors !== undefined ? settings.gifColors : (
            settings.optimization === 'high' ? 64 : settings.optimization === 'medium' ? 128 : 256
          );

          // Pass 1: generate palette
          await ffmpeg.exec([
            '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
            '-vf', `${scaleFilter},palettegen=max_colors=${maxColors}:stats_mode=${statsMode}`,
            '-y', 'palette.png'
          ]);

          setProgress(70);

          // Pass 2: use palette
          await ffmpeg.exec([
            '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
            '-i', 'palette.png',
            '-lavfi', `${scaleFilter} [x]; [x][1:v] paletteuse=dither=${dither}`,
            '-y', outputName
          ]);
        } else {
          // Basic GIF output
          await ffmpeg.exec([
            '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
            '-vf', scaleFilter,
            '-f', 'gif',
            '-y', outputName
          ]);
        }
      } else if (settings.format === 'webp') {
        const qv = settings.webpQuality !== undefined ? settings.webpQuality : (
          settings.optimization === 'high' ? 50 : settings.optimization === 'medium' ? 75 : 90
        );
        await ffmpeg.exec([
          '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
          '-vf', scaleFilter,
          '-c:v', 'libwebp_anim', '-loop', '0', '-q:v', String(qv),
          '-y', outputName
        ]);
      } else {
        // MP4
        const totalDuration = frames.reduce((acc, f) => acc + (f.duration / settings.globalSpeed), 0);
        
        // Write background audio file if present
        let audioFilename = '';
        if (audioTrack) {
          const audioExt = audioTrack.name.split('.').pop() || 'mp3';
          audioFilename = `input_audio.${audioExt}`;
          const audioData = await fetchFile(audioTrack);
          await ffmpeg.writeFile(audioFilename, audioData);
        }

        // Write SFX audio files if present and calculate offsets
        let currentOffset = 0;
        const sfxInputs: { filename: string; delayMs: number; volume: number; start: number; duration: number }[] = [];
        
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          const effectiveDuration = frame.duration / settings.globalSpeed;
          
          if (frame.sfx) {
            const sfxExt = frame.sfx.name.split('.').pop() || 'mp3';
            const sfxFilename = `sfx_${frame.id}.${sfxExt}`;
            const sfxData = await fetchFile(frame.sfx.file);
            await ffmpeg.writeFile(sfxFilename, sfxData);
            
            sfxInputs.push({
              filename: sfxFilename,
              delayMs: Math.round(currentOffset * 1000),
              volume: frame.sfx.volume,
              start: frame.sfx.start || 0,
              duration: (frame.sfx.end - frame.sfx.start) || 1.0
            });
          }
          currentOffset += effectiveDuration;
        }

        const execArgs = [
          '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt'
        ];

        let inputIndex = 1;
        let bgMusicIndex = -1;
        
        if (audioTrack && audioFilename) {
          execArgs.push('-stream_loop', '-1', '-i', audioFilename);
          bgMusicIndex = inputIndex;
          inputIndex++;
        }

        const sfxStartIndex = inputIndex;
        for (const sfx of sfxInputs) {
          execArgs.push('-ss', sfx.start.toFixed(3), '-t', sfx.duration.toFixed(3), '-i', sfx.filename);
          inputIndex++;
        }

        const crf = settings.mp4Quality !== undefined ? settings.mp4Quality : (
          settings.optimization === 'high' ? 32 :
          settings.optimization === 'medium' ? 26 :
          settings.optimization === 'low' ? 21 : 18
        );

        execArgs.push(
          '-vf', scaleFilter,
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
          '-crf', String(crf)
        );

        const hasAudio = bgMusicIndex !== -1 || sfxInputs.length > 0;
        
        if (hasAudio) {
          let filterComplex = '';
          const amixInputs: string[] = [];

          if (bgMusicIndex !== -1) {
            filterComplex += `[${bgMusicIndex}:a]volume=${audioVolume || 1.0}[bg_music]; `;
            amixInputs.push('[bg_music]');
          }

          sfxInputs.forEach((sfx, idx) => {
            const sfxInputIdx = sfxStartIndex + idx;
            const label = `sfx_${idx}`;
            filterComplex += `[${sfxInputIdx}:a]adelay=${sfx.delayMs}|${sfx.delayMs},volume=${sfx.volume}[${label}]; `;
            amixInputs.push(`[${label}]`);
          });

          if (amixInputs.length === 1) {
            if (bgMusicIndex !== -1) {
              filterComplex = `[${bgMusicIndex}:a]volume=${audioVolume || 1.0}[aout]`;
            } else {
              const sfx = sfxInputs[0];
              filterComplex = `[${sfxStartIndex}:a]adelay=${sfx.delayMs}|${sfx.delayMs},volume=${sfx.volume}[aout]`;
            }
          } else {
            filterComplex += `${amixInputs.join('')}amix=inputs=${amixInputs.length}[aout]`;
          }

          execArgs.push(
            '-filter_complex', filterComplex,
            '-map', '0:v',
            '-map', '[aout]',
            '-c:a', 'aac',
            '-t', totalDuration.toFixed(3)
          );
        }

        execArgs.push('-y', outputName);

        await ffmpeg.exec(execArgs);
      }

      setProgress(90);

      const data = await ffmpeg.readFile(outputName);
      const mimeType = settings.format === 'gif' ? 'image/gif' : settings.format === 'webp' ? 'image/webp' : 'video/mp4';
      const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      setRendering(false);
      setProgress(100);
      return url;
      
    } catch (e) {
      console.error("Rendering error:", e);
      setRendering(false);
      return null;
    }
  };

  return {
    loaded,
    loading,
    loadProgress,
    progress,
    rendering,
    renderMedia
  };
}

// ─── Helper functions ───
function drawImageCover(ctx: OffscreenCanvasRenderingContext2D, img: ImageBitmap, cw: number, ch: number) {
  const ratio = Math.min(cw / img.width, ch / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

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
