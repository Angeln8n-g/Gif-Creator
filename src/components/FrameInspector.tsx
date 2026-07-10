import { useState } from 'react';
import type { FrameImage, AnimationType, TransitionType, TextOverlay, StickerOverlay, CropSettings } from '../types';
import { AnimationPicker } from './AnimationPicker';
import { TransitionPicker } from './TransitionPicker';
import { TextEditor } from './TextEditor';
import { StickerPicker } from './StickerPicker';
import { CropEditor } from './CropEditor';
import { EditorModal } from './EditorModal';
import { FramePreviewCanvas } from './FramePreviewCanvas';
import { Trash2, Crop, Type, Smile } from 'lucide-react';

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
}

type ModalType = 'crop' | 'text' | 'stickers' | null;

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
}: FrameInspectorProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

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
          />
        }
      >
        <StickerPicker
          stickers={frame.stickers}
          onChange={(stickers) => onStickersChange(frame.id, stickers)}
        />
      </EditorModal>
    </>
  );
}
