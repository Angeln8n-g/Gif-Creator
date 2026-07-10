import { useState } from 'react';
import type { StickerOverlay, TextAnimation } from '../types';
import { X, Move, RotateCw } from 'lucide-react';
import { AnimationPicker } from './AnimationPicker';
import { TransitionPicker } from './TransitionPicker';

const stickerAnimations: { value: TextAnimation; label: string }[] = [
  { value: 'none', label: 'Ninguna' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'bounce', label: 'Bounce' },
];

const emojiCategories = [
  {
    name: 'Caras',
    emojis: ['😀', '😂', '🥹', '😎', '🤩', '😍', '🥳', '🤔', '😱', '🤯', '😴', '🫠'],
  },
  {
    name: 'Manos',
    emojis: ['👍', '👎', '👋', '✌️', '🤞', '🤙', '👏', '🙌', '💪', '🫶', '🤝', '✋'],
  },
  {
    name: 'Objetos',
    emojis: ['🔥', '⭐', '💯', '❤️', '💎', '🎉', '🎯', '🏆', '💡', '🚀', '⚡', '🌈'],
  },
  {
    name: 'Animales',
    emojis: ['🐱', '🐶', '🦊', '🐻', '🐼', '🐸', '🦋', '🐝', '🦄', '🐠', '🦜', '🐙'],
  },
];

interface StickerPickerProps {
  stickers: StickerOverlay[];
  onChange: (stickers: StickerOverlay[]) => void;
}

export function StickerPicker({ stickers, onChange }: StickerPickerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: crypto.randomUUID(),
      emoji,
      x: 50,
      y: 50,
      size: 48,
      rotation: 0,
      animation: 'none',
      cameraMovement: 'none',
      transition: 'none'
    };
    onChange([...stickers, newSticker]);
  };

  const removeSticker = (id: string) => {
    onChange(stickers.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateSticker = (id: string, updates: Partial<StickerOverlay>) => {
    onChange(stickers.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  return (
    <div className="space-y-4">

      {/* Active stickers list */}
      {stickers.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-400 mb-2 block">Stickers Activos</label>
          <div className="flex flex-wrap gap-1.5">
            {stickers.map(s => (
              <div key={s.id} className="relative group">
                <button
                  onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                  className={`text-2xl p-1.5 rounded-lg transition-all cursor-pointer
                    ${editingId === s.id ? 'bg-amber-500/20 ring-1 ring-amber-500' : 'bg-black/30 hover:bg-black/50'}`}
                >
                  {s.emoji}
                </button>
                <button
                  onClick={() => removeSticker(s.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editing controls for selected sticker */}
      {editingId && (() => {
        const sticker = stickers.find(s => s.id === editingId);
        if (!sticker) return null;
        return (
          <div className="p-3 bg-black/30 rounded-xl border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
              <Move size={12} />
              <span>Editar {sticker.emoji}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">X</span>
                  <span className="text-[10px] font-mono text-amber-400">{sticker.x}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={sticker.x}
                  onChange={(e) => updateSticker(sticker.id, { x: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">Y</span>
                  <span className="text-[10px] font-mono text-amber-400">{sticker.y}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={sticker.y}
                  onChange={(e) => updateSticker(sticker.id, { y: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">Tamaño</span>
                  <span className="text-[10px] font-mono text-amber-400">{sticker.size}px</span>
                </div>
                <input
                  type="range" min="16" max="128" value={sticker.size}
                  onChange={(e) => updateSticker(sticker.id, { size: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
              <div className="col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1"><RotateCw size={10} /> Rotación</span>
                  <span className="text-[10px] font-mono text-amber-400">{sticker.rotation || 0}°</span>
                </div>
                <input
                  type="range" min="0" max="360" value={sticker.rotation || 0}
                  onChange={(e) => updateSticker(sticker.id, { rotation: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Entry Animation */}
            <div className="border-t border-dark-border/50 pt-3">
              <label className="text-[10px] text-gray-400 font-medium mb-1.5 block">Animación de Entrada</label>
              <div className="flex gap-1.5 flex-wrap">
                {stickerAnimations.map(a => (
                  <button
                    key={a.value}
                    onClick={() => updateSticker(sticker.id, { animation: a.value })}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer
                      ${(sticker.animation || 'none') === a.value
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-black/30 text-gray-500 border border-dark-border hover:text-gray-300'
                      }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Camera and Transition */}
            <div className="grid grid-cols-1 gap-4 border-t border-dark-border/50 pt-3">
              <div>
                <AnimationPicker
                  value={sticker.cameraMovement || 'none'}
                  onChange={(anim) => updateSticker(sticker.id, { cameraMovement: anim })}
                />
              </div>
              <div>
                <TransitionPicker
                  value={sticker.transition || 'none'}
                  duration={0.5}
                  onChange={(trans) => updateSticker(sticker.id, { transition: trans })}
                  onDurationChange={() => {}}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Emoji Grid */}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-2 block">Agregar Sticker</label>
        {emojiCategories.map(cat => (
          <div key={cat.name} className="mb-3">
            <p className="text-[10px] text-gray-500 mb-1.5 font-medium uppercase tracking-wider">{cat.name}</p>
            <div className="flex flex-wrap gap-1">
              {cat.emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Clear all */}
      {stickers.length > 0 && (
        <button
          onClick={() => { onChange([]); setEditingId(null); }}
          className="w-full text-[10px] text-gray-500 hover:text-red-400 py-1.5 border border-dark-border hover:border-red-500/30 rounded-lg transition-all cursor-pointer"
        >
          Eliminar Todos los Stickers
        </button>
      )}
    </div>
  );
}
