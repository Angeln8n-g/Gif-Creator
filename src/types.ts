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
  | 'wipe-right';

export type TextAnimation = 
  | 'none' 
  | 'typewriter' 
  | 'fade-in' 
  | 'slide-up' 
  | 'bounce';

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

// ─── Frame Image ───
export interface FrameImage {
  id: string;
  file: File;
  previewUrl: string;
  duration: number; // seconds
  animation: AnimationType;
  transition: TransitionType;
  transitionDuration: number; // seconds (portion of frame duration used for transition)
  text?: TextOverlay;
  stickers: StickerOverlay[];
  crop?: CropSettings;
}

// ─── Render Settings ───
export type OutputFormat = 'gif' | 'mp4' | 'webp';
export type Resolution = '480p' | '720p' | '1080p' | 'custom';
export type OptimizationLevel = 'none' | 'low' | 'medium' | 'high';

export interface RenderSettings {
  format: OutputFormat;
  resolution: Resolution;
  customWidth?: number;
  customHeight?: number;
  globalSpeed: number; // multiplier: 0.25 – 4.0
  optimization: OptimizationLevel;
}

// ─── Effects Copy-Paste Types ───
export type EffectCategory = 'animation' | 'transition' | 'text' | 'stickers' | 'crop';

export interface EffectClipboard {
  sourceFrameId: string;
  /** Snapshot of the source frame's effects at the moment of copy */
  sourceEffects: Pick<FrameImage, 'animation' | 'transition' | 'transitionDuration' | 'text' | 'stickers' | 'crop'>;
}

export type EffectMask = Set<EffectCategory>;
