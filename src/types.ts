// ─── Animation Types ───
export type AnimationType = 
  | 'none'
  | 'zoom-in' 
  | 'zoom-out' 
  | 'pan-left' 
  | 'pan-right' 
  | 'pan-up' 
  | 'pan-down' 
  | 'fade-in' 
  | 'fade-out' 
  | 'rotate-cw' 
  | 'rotate-ccw' 
  | 'parallax' 
  | 'bounce';

export type TransitionType = 
  | 'none' 
  | 'crossfade' 
  | 'slide-left' 
  | 'slide-right' 
  | 'slide-up' 
  | 'slide-down' 
  | 'wipe-left' 
  | 'wipe-right'
  | 'fade-black'
  | 'fade-white'
  | 'zoom-in'
  | 'zoom-out'
  | 'wipe-up'
  | 'wipe-down';

export type FilterType = 'none' | 'grayscale' | 'sepia' | 'invert' | 'vintage' | 'cyberpunk' | 'warm' | 'cool' | 'blur';

export type TextAnimation = 
  | 'none' 
  | 'typewriter' 
  | 'typewriter-cursor'
  | 'fade-in' 
  | 'slide-up' 
  | 'bounce'
  | 'elastic'
  | 'spin-in'
  | 'fade-zoom'
  | 'rotate-3d';

// ─── Text Overlay ───
export interface TextOverlay {
  content: string;
  x: number; // 0-100 (percentage)
  y: number; // 0-100 (percentage)
  fontSize: number;
  fontFamily: string;
  color: string;
  shadowColor: string;
  animation: TextAnimation;
  rotation?: number; // 0-360 degrees
  cameraMovement?: AnimationType;
  transition?: TransitionType;
  outlineColor?: string;
  outlineWidth?: number; // 0-10px
  backgroundColor?: string;
  backgroundOpacity?: number; // 0.0 - 1.0
  align?: 'left' | 'center' | 'right';
}

// ─── Sticker / Emoji Overlay ───
export interface StickerOverlay {
  id: string;
  emoji: string;
  x: number; // 0-100 (percentage)
  y: number; // 0-100 (percentage)
  size: number; // font-size in px
  rotation?: number; // 0-360 degrees
  animation?: TextAnimation;
  cameraMovement?: AnimationType;
  transition?: TransitionType;
  type?: 'emoji' | 'custom';
  url?: string;
  file?: File;
}

// ─── Crop / Clip Settings ───
export type CropShape =
  | 'none'
  | 'rectangle'
  | 'rounded'
  | 'circle'
  | 'ellipse'
  | 'diamond'
  | 'hexagon'
  | 'octagon'
  | 'star'
  | 'heart'
  | 'triangle'
  | 'pentagon'
  | 'inset'
  | 'freeform';

export interface CropSettings {
  shape: CropShape;
  cornerRadius: number;       // 0-100 px (used for 'rounded' and 'rectangle')
  borderWidth: number;         // 0-20 px
  borderColor: string;         // hex color
  padding: number;             // 0-100 px (inner spacing from edge)
  margin: number;              // 0-100 px (outer spacing / inset from canvas edge)
  insetTop: number;            // 0-50 % crop from top
  insetRight: number;          // 0-50 % crop from right
  insetBottom: number;         // 0-50 % crop from bottom
  insetLeft: number;           // 0-50 % crop from left
  freeformPoints?: { x: number; y: number }[]; // percentage coordinates (0-100)
}

// ─── Image Adjustments (Lightroom Style) ───
export interface ImageAdjustments {
  brightness: number;  // 0.5 – 1.5 (default 1.0)
  contrast: number;    // 0.5 – 1.5 (default 1.0)
  saturation: number;  // 0.0 – 2.0 (default 1.0)
  exposure: number;    // -0.5 – 0.5 (default 0.0)
  temperature: number; // -50 – 50 (default 0)
}

export interface FrameImage {
  id: string;
  file: File;
  previewUrl: string;
  duration: number; // seconds
  animation: AnimationType;
  filter?: FilterType;
  transition: TransitionType;
  transitionDuration: number; // seconds (portion of frame duration used for transition)
  text?: TextOverlay;
  stickers: StickerOverlay[];
  crop?: CropSettings;
  adjustments?: ImageAdjustments;
  sfx?: {
    name: string;
    url: string;
    file: File;
    volume: number;
    start: number;
    end: number;
  };
}

// ─── Render Settings ───
export type OutputFormat = 'gif' | 'mp4' | 'webp' | 'apng';
export type Resolution = '480p' | '720p' | '1080p' | 'custom';
export type OptimizationLevel = 'none' | 'low' | 'medium' | 'high';

export interface RenderSettings {
  format: OutputFormat;
  resolution: Resolution;
  customWidth?: number;
  customHeight?: number;
  globalSpeed: number; // multiplier: 0.25 – 4.0
  optimization: OptimizationLevel;
  gifColors?: number;
  gifDither?: 'floyd_steinberg' | 'bayer' | 'none';
  webpQuality?: number;
  mp4Quality?: number;
  watermarkText?: string;
  watermarkOpacity?: number; // 0.0 to 1.0
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// ─── Effects Copy-Paste Types ───
export type EffectCategory = 'animation' | 'transition' | 'text' | 'stickers' | 'crop' | 'filter';

export interface EffectClipboard {
  sourceFrameId: string;
  /** Snapshot of the source frame's effects at the moment of copy */
  sourceEffects: Pick<FrameImage, 'animation' | 'transition' | 'transitionDuration' | 'text' | 'stickers' | 'crop' | 'filter'>;
}

export type EffectMask = Set<EffectCategory>;
