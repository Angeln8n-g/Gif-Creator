import type { TextOverlay, TextAnimation } from '../types';
import { Palette, RotateCw } from 'lucide-react';
import { AnimationPicker } from './AnimationPicker';
import { TransitionPicker } from './TransitionPicker';

const textAnimations: { value: TextAnimation; label: string }[] = [
  { value: 'none', label: 'Estático' },
  { value: 'typewriter', label: 'Máquina' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'bounce', label: 'Bounce' },
];

const fontFamilies = [
  'Inter', 'Arial', 'Impact', 'Comic Sans MS', 'Courier New', 'Georgia', 'Times New Roman'
];

const presetColors = [
  '#FFFFFF', '#000000', '#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
];

interface TextEditorProps {
  text?: TextOverlay;
  onChange: (text: TextOverlay | undefined) => void;
}

export function TextEditor({ text, onChange }: TextEditorProps) {
  const defaultText: TextOverlay = {
    content: '',
    x: 50,
    y: 80,
    fontSize: 32,
    fontFamily: 'Inter',
    color: '#FFFFFF',
    shadowColor: '#000000',
    animation: 'none',
    rotation: 0,
    cameraMovement: 'none',
    transition: 'none'
  };

  const current = text || defaultText;

  const handleUpdate = (updates: Partial<TextOverlay>) => {
    const updated = { ...current, ...updates };
    if (updated.content.trim() === '') {
      onChange(undefined);
    } else {
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Text Input */}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Contenido</label>
        <input
          type="text"
          placeholder="Escribe tu texto aquí..."
          value={current.content}
          onChange={(e) => handleUpdate({ content: e.target.value })}
          className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2.5 text-sm text-light focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-600"
        />
      </div>

      {/* Font + Size row */}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tipografía</label>
        <div className="flex gap-2">
          <select
            value={current.fontFamily}
            onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
            className="flex-1 bg-black/40 border border-dark-border rounded-lg px-2 py-2 text-xs text-light focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
          >
            {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={10}
              max={120}
              value={current.fontSize}
              onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) || 32 })}
              className="w-16 bg-black/40 border border-dark-border rounded-lg px-2 py-2 text-xs text-light text-center focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-gray-500">px</span>
          </div>
        </div>
      </div>

      {/* Color pickers */}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1.5">
          <Palette size={12} />
          Color del Texto
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {presetColors.map(c => (
            <button
              key={c}
              onClick={() => handleUpdate({ color: c })}
              className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer hover:scale-110
                ${current.color === c ? 'border-white scale-110 shadow-lg' : 'border-dark-border'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Position sliders */}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-2 block">Posición</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Pos. X</span>
              <span className="text-[10px] font-mono text-blue-400">{current.x}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={current.x}
              onChange={(e) => handleUpdate({ x: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Pos. Y</span>
              <span className="text-[10px] font-mono text-blue-400">{current.y}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={current.y}
              onChange={(e) => handleUpdate({ y: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 flex items-center gap-1"><RotateCw size={10} /> Rotación</span>
              <span className="text-[10px] font-mono text-blue-400">{current.rotation || 0}°</span>
            </div>
            <input
              type="range" min="0" max="360" value={current.rotation || 0}
              onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Text Animation */}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-2 block">Animación de Entrada</label>
        <div className="flex gap-1.5 flex-wrap">
          {textAnimations.map(a => (
            <button
              key={a.value}
              onClick={() => handleUpdate({ animation: a.value })}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer
                ${current.animation === a.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-black/30 text-gray-500 border border-dark-border hover:text-gray-300'
                }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera and Transition */}
      <div className="grid grid-cols-1 gap-4 border-t border-dark-border/50 pt-4">
        <div>
          <AnimationPicker
            value={current.cameraMovement || 'none'}
            onChange={(anim) => handleUpdate({ cameraMovement: anim })}
          />
        </div>
        <div>
          <TransitionPicker
            value={current.transition || 'none'}
            duration={0.5}
            onChange={(trans) => handleUpdate({ transition: trans })}
            onDurationChange={() => {}}
          />
        </div>
      </div>

      {/* Clear text */}
      {current.content && (
        <button
          onClick={() => onChange(undefined)}
          className="w-full text-[10px] text-gray-500 hover:text-red-400 py-1.5 border border-dark-border hover:border-red-500/30 rounded-lg transition-all cursor-pointer"
        >
          Eliminar Texto
        </button>
      )}
    </div>
  );
}
