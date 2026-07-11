import { useState, useEffect } from 'react';
import type { FrameImage, AnimationType, TransitionType, TextOverlay, StickerOverlay, CropSettings, FilterType, ImageAdjustments } from '../types';
import { AnimationPicker } from './AnimationPicker';
import { TransitionPicker } from './TransitionPicker';
import { TextEditor } from './TextEditor';
import { StickerPicker } from './StickerPicker';
import { CropEditor } from './CropEditor';
import { EditorModal } from './EditorModal';
import { FramePreviewCanvas } from './FramePreviewCanvas';
import { Trash2, Crop, Type, Smile, Volume2, Music, Sun, RotateCcw } from 'lucide-react';

interface FrameInspectorProps {
  frame: FrameImage;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onAnimationChange: (id: string, animation: AnimationType) => void;
  onTransitionChange: (id: string, transition: TransitionType) => void;
  onTransitionDurationChange: (id: string, duration: number) => void;
  onTextChange: (id: string, text: TextOverlay | undefined) => void;
  onStickersChange: (id: string, stickers: StickerOverlay[]) => void;
  onCropChange: (id: string, crop: CropSettings | undefined) => void;
  onSfxChange: (id: string, sfx: FrameImage['sfx'] | undefined) => void;
  onFilterChange: (id: string, filter: FilterType) => void;
  onAdjustmentsChange: (id: string, adjustments: ImageAdjustments | undefined) => void;
}

type ModalType = 'crop' | 'text' | 'stickers' | 'sfx' | null;

export function FrameInspector({
  frame,
  onRemove,
  onDurationChange,
  onAnimationChange,
  onTransitionChange,
  onTransitionDurationChange,
  onTextChange,
  onStickersChange,
  onCropChange,
  onSfxChange,
  onFilterChange,
  onAdjustmentsChange,
}: FrameInspectorProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [sfxDuration, setSfxDuration] = useState<number>(10);

  // Auto-load metadata duration when frame SFX changes
  useEffect(() => {
    if (frame.sfx) {
      const tempAudio = new Audio(frame.sfx.url);
      const onLoadedMetadata = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setSfxDuration(tempAudio.duration);
        }
      };
      tempAudio.addEventListener('loadedmetadata', onLoadedMetadata);
      tempAudio.load();
      return () => {
        tempAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
        tempAudio.pause();
      };
    }
  }, [frame.sfx?.url]);

  // Badge helpers
  const hasCrop = frame.crop && frame.crop.shape !== 'none';
  const hasText = frame.text && frame.text.content;
  const hasStickers = frame.stickers.length > 0;

  return (
    <>
      <div className="bg-dark-card border border-dark-border rounded-xl flex flex-col md:flex-row overflow-hidden shadow-lg shadow-black/20">
        
        {/* Left: Preview & Basics */}
        <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-dark-border flex flex-col space-y-4">
          <div className="aspect-video w-full overflow-hidden bg-black flex items-center justify-center rounded-lg border border-dark-border shadow-inner">
            <img src={frame.previewUrl} alt="frame" className="w-full h-full object-contain" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Duración (s)</label>
              <span className="text-sm font-mono text-cta">{frame.duration.toFixed(1)}s</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="10" 
              step="0.1" 
              value={frame.duration}
              onChange={(e) => onDurationChange(frame.id, parseFloat(e.target.value))}
              className="w-full h-2 bg-dark-bg border border-dark-border rounded-lg appearance-none cursor-pointer accent-cta"
            />
          </div>

          <button
            onClick={() => onRemove(frame.id)}
            className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Eliminar Fotograma</span>
          </button>
        </div>

        {/* Right: Effects & Overlays */}
        <div className="w-full md:w-2/3 p-4 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[400px] md:max-h-[500px] custom-scrollbar">
          
          <div className="space-y-6">
            {/* Animation */}
            <div>
              <h4 className="text-sm font-semibold text-light mb-3 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cta"></span>
                <span>Movimiento & Cámara</span>
              </h4>
              <AnimationPicker
                value={frame.animation}
                onChange={(animation) => onAnimationChange(frame.id, animation)}
              />
            </div>

            {/* Transition */}
            <div>
              <h4 className="text-sm font-semibold text-light mb-3 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>Transición (al siguiente)</span>
              </h4>
              <TransitionPicker
                value={frame.transition}
                duration={frame.transitionDuration}
                onChange={(transition) => onTransitionChange(frame.id, transition)}
                onDurationChange={(duration) => onTransitionDurationChange(frame.id, duration)}
              />
            </div>

            {/* Color Filter */}
            <div className="md:col-span-2 pt-4 border-t border-dark-border/40">
              <h4 className="text-sm font-semibold text-light mb-3 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Filtro de Color</span>
              </h4>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'none', label: 'Sin Filtro' },
                  { value: 'grayscale', label: 'B&N' },
                  { value: 'sepia', label: 'Sepia' },
                  { value: 'invert', label: 'Invertido' },
                  { value: 'warm', label: 'Cálido' },
                  { value: 'cool', label: 'Frío' },
                  { value: 'vintage', label: 'Vintage' },
                  { value: 'cyberpunk', label: 'Cyberpunk' },
                  { value: 'blur', label: 'Desenfocar' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => onFilterChange(frame.id, f.value as FilterType)}
                    className={`px-2 py-1.5 rounded-lg text-center text-[10px] font-semibold border transition-all duration-200 cursor-pointer
                      ${(frame.filter || 'none') === f.value
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                        : 'bg-dark-bg border-dark-border/60 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Adjustments (Lightroom Style) */}
            <div className="md:col-span-2 pt-4 border-t border-dark-border/40">
              <h4 className="text-sm font-semibold text-light mb-3 flex items-center space-x-2">
                <Sun size={14} className="text-amber-400" />
                <span>Ajustes de Imagen</span>
                <button
                  onClick={() => onAdjustmentsChange(frame.id, undefined)}
                  className="ml-auto text-[9px] text-gray-500 hover:text-amber-400 flex items-center space-x-1 cursor-pointer"
                  title="Restablecer ajustes"
                >
                  <RotateCcw size={10} />
                  <span>Restablecer</span>
                </button>
              </h4>
              {(() => {
                const defaultAdj: ImageAdjustments = { brightness: 1, contrast: 1, saturation: 1, exposure: 0, temperature: 0 };
                const adj = { ...defaultAdj, ...frame.adjustments };
                const updateAdj = (key: keyof ImageAdjustments, val: number) => {
                  onAdjustmentsChange(frame.id, { ...adj, [key]: val });
                };
                const sliders: { key: keyof ImageAdjustments; label: string; min: number; max: number; step: number; def: number }[] = [
                  { key: 'brightness', label: 'Brillo', min: 0.5, max: 1.5, step: 0.01, def: 1 },
                  { key: 'contrast', label: 'Contraste', min: 0.5, max: 1.5, step: 0.01, def: 1 },
                  { key: 'saturation', label: 'Saturación', min: 0, max: 2, step: 0.01, def: 1 },
                  { key: 'exposure', label: 'Exposición', min: -0.5, max: 0.5, step: 0.01, def: 0 },
                  { key: 'temperature', label: 'Temperatura', min: -50, max: 50, step: 1, def: 0 },
                ];
                return (
                  <div className="space-y-2">
                    {sliders.map(s => (
                      <div key={s.key}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-400">{s.label}</span>
                          <span className="text-[10px] font-mono text-amber-400">{adj[s.key].toFixed(s.step < 1 ? 2 : 0)}</span>
                        </div>
                        <input
                          type="range" min={s.min} max={s.max} step={s.step} value={adj[s.key]}
                          onChange={e => updateAdj(s.key, parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Modal Trigger Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-light mb-1 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Herramientas de Edición</span>
            </h4>
            <p className="text-[10px] text-gray-500 -mt-1 mb-2">Abre cada herramienta con vista previa en vivo</p>

            {/* Crop Button */}
            <button
              onClick={() => setActiveModal('crop')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer group
                ${hasCrop
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-dark-bg/50 border-dark-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
                }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${hasCrop ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-bg text-gray-500 group-hover:text-emerald-400'}`}>
                <Crop size={18} />
              </div>
              <div className="flex-1 text-left">
                <span className={`text-xs font-medium block ${hasCrop ? 'text-emerald-400' : 'text-gray-300'}`}>
                  Recorte de Imagen
                </span>
                <span className="text-[10px] text-gray-500">
                  {hasCrop ? `Forma: ${frame.crop!.shape}` : 'Sin recorte aplicado'}
                </span>
              </div>
              {hasCrop && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            </button>

            {/* Text Button */}
            <button
              onClick={() => setActiveModal('text')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer group
                ${hasText
                  ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                  : 'bg-dark-bg/50 border-dark-border hover:border-blue-500/40 hover:bg-blue-500/5'
                }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${hasText ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-bg text-gray-500 group-hover:text-blue-400'}`}>
                <Type size={18} />
              </div>
              <div className="flex-1 text-left">
                <span className={`text-xs font-medium block ${hasText ? 'text-blue-400' : 'text-gray-300'}`}>
                  Texto Superpuesto
                </span>
                <span className="text-[10px] text-gray-500">
                  {hasText ? `"${frame.text!.content!.slice(0, 20)}${frame.text!.content!.length > 20 ? '…' : ''}"` : 'Sin texto'}
                </span>
              </div>
              {hasText && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
            </button>

            {/* Stickers Button */}
            <button
              onClick={() => setActiveModal('stickers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer group
                ${hasStickers
                  ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-dark-bg/50 border-dark-border hover:border-amber-500/40 hover:bg-amber-500/5'
                }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${hasStickers ? 'bg-amber-500/20 text-amber-400' : 'bg-dark-bg text-gray-500 group-hover:text-amber-400'}`}>
                <Smile size={18} />
              </div>
              <div className="flex-1 text-left">
                <span className={`text-xs font-medium block ${hasStickers ? 'text-amber-400' : 'text-gray-300'}`}>
                  Stickers & Emojis
                </span>
                <span className="text-[10px] text-gray-500">
                  {hasStickers ? `${frame.stickers.length} sticker${frame.stickers.length > 1 ? 's' : ''}` : 'Sin stickers'}
                </span>
              </div>
              {hasStickers && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </button>

            {/* SFX Button */}
            <button
              onClick={() => setActiveModal('sfx')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer group
                ${frame.sfx
                  ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-dark-bg/50 border-dark-border hover:border-rose-500/40 hover:bg-rose-500/5'
                }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${frame.sfx ? 'bg-rose-500/20 text-rose-400' : 'bg-dark-bg text-gray-500 group-hover:text-rose-400'}`}>
                <Volume2 size={18} />
              </div>
              <div className="flex-1 text-left">
                <span className={`text-xs font-medium block ${frame.sfx ? 'text-rose-400' : 'text-gray-300'}`}>
                  Efecto de Sonido (SFX)
                </span>
                <span className="text-[10px] text-gray-500">
                  {frame.sfx ? frame.sfx.name : 'Sin efectos de sonido'}
                </span>
              </div>
              {frame.sfx && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            </button>
          </div>

        </div>
      </div>

      {/* ── Crop Modal ── */}
      <EditorModal
        isOpen={activeModal === 'crop'}
        onClose={() => setActiveModal(null)}
        title="Recorte de Imagen"
        icon={<Crop size={16} />}
        accentColor="emerald"
        preview={
          <FramePreviewCanvas
            frame={frame}
            cropOverride={frame.crop}
          />
        }
      >
        <CropEditor
          crop={frame.crop}
          onChange={(crop) => onCropChange(frame.id, crop)}
        />
      </EditorModal>

      {/* ── Text Modal ── */}
      <EditorModal
        isOpen={activeModal === 'text'}
        onClose={() => setActiveModal(null)}
        title="Texto Superpuesto"
        icon={<Type size={16} />}
        accentColor="blue"
        preview={
          <FramePreviewCanvas
            frame={frame}
            textOverride={frame.text}
            onTextChange={(text) => onTextChange(frame.id, text)}
          />
        }
      >
        <TextEditor
          text={frame.text}
          onChange={(text) => onTextChange(frame.id, text)}
        />
      </EditorModal>

      {/* ── Stickers Modal ── */}
      <EditorModal
        isOpen={activeModal === 'stickers'}
        onClose={() => setActiveModal(null)}
        title="Stickers & Emojis"
        icon={<Smile size={16} />}
        accentColor="amber"
        preview={
          <FramePreviewCanvas
            frame={frame}
            stickersOverride={frame.stickers}
            onStickersChange={(stickers) => onStickersChange(frame.id, stickers)}
          />
        }
      >
        <StickerPicker
          stickers={frame.stickers}
          onChange={(stickers) => onStickersChange(frame.id, stickers)}
        />
      </EditorModal>

      {/* ── SFX Modal ── */}
      <EditorModal
        isOpen={activeModal === 'sfx'}
        onClose={() => setActiveModal(null)}
        title="Efecto de Sonido (SFX)"
        icon={<Volume2 size={16} />}
        accentColor="rose"
        preview={
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-400 shadow-md">
              <Volume2 size={32} className={frame.sfx ? "animate-bounce" : ""} />
            </div>
            {frame.sfx ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-200 max-w-[250px] truncate">
                  {frame.sfx.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(frame.sfx.file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => {
                    if (!frame.sfx) return;
                    const audio = new Audio(frame.sfx.url);
                    audio.volume = frame.sfx.volume;
                    audio.currentTime = frame.sfx.start;
                    
                    const onTimeUpdate = () => {
                      if (audio.currentTime >= frame.sfx!.end) {
                        audio.pause();
                        audio.removeEventListener('timeupdate', onTimeUpdate);
                      }
                    };
                    audio.addEventListener('timeupdate', onTimeUpdate);
                    audio.play().catch(e => console.log("Test play failed:", e));
                  }}
                  className="mt-3 px-4 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Probar sonido
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Ningún efecto de sonido cargado para este fotograma.
              </p>
            )}
          </div>
        }
      >
        <div className="p-4 space-y-6">
          {frame.sfx ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-dark-bg/60 border border-dark-border rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-200 truncate">{frame.sfx.name}</p>
                </div>
                <button
                  onClick={() => onSfxChange(frame.id, undefined)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Volumen del efecto</span>
                  <span className="font-mono text-rose-400">{Math.round(frame.sfx.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={frame.sfx.volume}
                  onChange={(e) => {
                    const volume = parseFloat(e.target.value);
                    onSfxChange(frame.id, { ...frame.sfx!, volume });
                  }}
                  className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* SFX Trimmer */}
              <div className="space-y-4 pt-4 border-t border-dark-border/40">
                <h5 className="text-xs font-semibold text-gray-300">Recorte del Audio (Trimmer)</h5>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Inicio</span>
                      <span className="font-mono text-rose-400">{frame.sfx.start.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={sfxDuration.toString()}
                      step="0.05"
                      value={frame.sfx.start}
                      onChange={(e) => {
                        const start = parseFloat(e.target.value);
                        const end = Math.max(start + 0.1, frame.sfx!.end);
                        onSfxChange(frame.id, { ...frame.sfx!, start, end });
                      }}
                      className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Fin</span>
                      <span className="font-mono text-rose-400">{frame.sfx.end.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={sfxDuration.toString()}
                      step="0.05"
                      value={frame.sfx.end}
                      onChange={(e) => {
                        const end = parseFloat(e.target.value);
                        const start = Math.min(end - 0.1, frame.sfx!.start);
                        onSfxChange(frame.id, { ...frame.sfx!, start, end });
                      }}
                      className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>Duración del clip: {(frame.sfx.end - frame.sfx.start).toFixed(2)}s</span>
                  <span>Duración total: {sfxDuration.toFixed(2)}s</span>
                </div>
              </div>

            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-dark-border hover:border-rose-500/40 bg-dark-bg/30 hover:bg-rose-500/5 rounded-xl p-8 transition-colors cursor-pointer text-center group">
              <Music size={28} className="text-gray-500 mb-2 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-semibold text-gray-300">Seleccionar Efecto de Sonido</span>
              <span className="text-[10px] text-gray-500 mt-1">Soporta MP3, WAV, M4A</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    // Fetch duration to initialize start/end
                    const tempAudio = new Audio(url);
                    tempAudio.addEventListener('loadedmetadata', () => {
                      const duration = tempAudio.duration || 1.0;
                      onSfxChange(frame.id, {
                        name: file.name,
                        url,
                        file,
                        volume: 1.0,
                        start: 0,
                        end: duration
                      });
                    });
                    tempAudio.load();
                  }
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      </EditorModal>
    </>
  );
}
