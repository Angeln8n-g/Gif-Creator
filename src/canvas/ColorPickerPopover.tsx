import { useState } from 'react';
import { Pipette } from 'lucide-react';

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#e11d48', '#f97316', 
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', 
  '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
  '#10b981', '#84cc16', '#3b0764', '#0f172a',
  '#64748b', '#cbd5e1', '#ffe4e6', '#ccfbf1'
];

export function ColorPickerPopover({
  color,
  onChange,
  opacity,
  onOpacityChange
}: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        onChange(result.sRGBHex);
      } catch (err) {
        console.warn('Eyedropper canceled or failed:', err);
      }
    } else {
      alert('Tu navegador no soporta la herramienta Eyedropper. Prueba en Chrome o Edge.');
    }
  };

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center space-x-2 bg-dark-bg border border-dark-border p-1.5 rounded-xl">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 transition-all hover:scale-105 shadow-inner"
          style={{ backgroundColor: color, opacity: opacity }}
          title="Seleccionar Color"
        />
        <div className="w-[1px] h-5 bg-dark-border" />
        <button
          onClick={handleEyedropper}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card transition-colors cursor-pointer"
          title="Pipeta selector de color (EyeDropper)"
        >
          <Pipette size={18} />
        </button>
      </div>

      {isOpen && (
        <>
          {/* Overlay to close popover */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 mt-2 w-64 bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Paleta de Colores</h4>
            
            {/* Grid of presets */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className="w-9 h-9 rounded-lg border border-white/5 hover:border-white/40 cursor-pointer transition-all hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Custom Input */}
            <div className="space-y-3 pt-3 border-t border-dark-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Color Hex:</span>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-24 px-2 py-1 bg-dark-bg border border-dark-border rounded-lg text-white text-xs text-center font-mono focus:border-cta focus:outline-none"
                />
              </div>

              {/* Opacity slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">Opacidad:</span>
                  <span className="text-white font-semibold">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-cta"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
