import type { FrameImage, AnimationType, TransitionType, FilterType, ImageAdjustments } from '../types';
import { AnimationPicker } from './AnimationPicker';
import { TransitionPicker } from './TransitionPicker';
import { Trash2, Sun, RotateCcw } from 'lucide-react';

interface BatchFrameInspectorProps {
  selectedFrames: FrameImage[];
  onRemoveSelected: () => void;
  onDurationChangeSelected: (duration: number) => void;
  onAnimationChangeSelected: (animation: AnimationType) => void;
  onTransitionChangeSelected: (transition: TransitionType) => void;
  onTransitionDurationChangeSelected: (duration: number) => void;
  onFilterChangeSelected: (filter: FilterType) => void;
  onAdjustmentsChangeSelected: (updateFn: (prev: ImageAdjustments | undefined) => ImageAdjustments | undefined) => void;
}

export function BatchFrameInspector({
  selectedFrames,
  onRemoveSelected,
  onDurationChangeSelected,
  onAnimationChangeSelected,
  onTransitionChangeSelected,
  onTransitionDurationChangeSelected,
  onFilterChangeSelected,
  onAdjustmentsChangeSelected,
}: BatchFrameInspectorProps) {
  
  if (selectedFrames.length === 0) return null;

  // Calculate defaults (if all match, show value, otherwise mixed)
  const allDurationsMatch = selectedFrames.every(f => f.duration === selectedFrames[0].duration);
  const defaultDuration = allDurationsMatch ? selectedFrames[0].duration : 1.0;

  const allAnimationsMatch = selectedFrames.every(f => f.animation === selectedFrames[0].animation);
  const defaultAnimation = allAnimationsMatch ? selectedFrames[0].animation : 'none';

  const allTransitionsMatch = selectedFrames.every(f => f.transition === selectedFrames[0].transition);
  const defaultTransition = allTransitionsMatch ? selectedFrames[0].transition : 'none';

  const allTransitionDurationsMatch = selectedFrames.every(f => f.transitionDuration === selectedFrames[0].transitionDuration);
  const defaultTransitionDuration = allTransitionDurationsMatch ? selectedFrames[0].transitionDuration : 0.5;

  const allFiltersMatch = selectedFrames.every(f => (f.filter || 'none') === (selectedFrames[0].filter || 'none'));
  const defaultFilter = allFiltersMatch ? (selectedFrames[0].filter || 'none') : 'none';

  return (
    <div className="flex flex-col space-y-6 w-full">
      
      {/* Left: Selected Frames Overview */}
      <div className="w-full flex flex-col space-y-4 pb-6 border-b border-dark-border/40">
        <div>
          <h3 className="text-sm font-semibold text-light mb-1">Edición en Lote</h3>
          <p className="text-xs text-gray-400">{selectedFrames.length} fotogramas seleccionados</p>
        </div>

        {/* Thumbnails grid */}
        <div className="flex flex-wrap gap-2 p-2 bg-dark-bg/30 rounded-lg border border-dark-border/50 max-h-[140px] overflow-y-auto custom-scrollbar">
          {selectedFrames.slice(0, 12).map((f, idx) => (
            <div key={f.id} className="relative w-14 aspect-video bg-black rounded-md overflow-hidden border border-dark-border shadow-sm group">
              <img src={f.previewUrl} alt={`Selected ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 bg-black/60 px-1 rounded-tl text-[8px] font-mono text-gray-400">
                #{idx + 1}
              </div>
            </div>
          ))}
          {selectedFrames.length > 12 && (
            <div className="w-14 aspect-video bg-dark-card rounded-md border border-dashed border-dark-border flex items-center justify-center text-xs text-gray-400 font-semibold">
              +{selectedFrames.length - 12}
            </div>
          )}
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Duración (s)</label>
            <span className="text-sm font-mono text-cta">
              {allDurationsMatch ? `${defaultDuration.toFixed(1)}s` : 'Varios'}
            </span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="10" 
            step="0.1" 
            value={allDurationsMatch ? defaultDuration : 1.0}
            onChange={(e) => onDurationChangeSelected(parseFloat(e.target.value))}
            className="w-full h-2 bg-dark-bg border border-dark-border rounded-lg appearance-none cursor-pointer accent-cta"
          />
          {!allDurationsMatch && (
            <span className="text-[10px] text-gray-500 block mt-1">Arrastra para aplicar la misma duración a todos</span>
          )}
        </div>

        <button
          onClick={onRemoveSelected}
          className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer mt-auto"
        >
          <Trash2 size={16} />
          <span>Eliminar Selección</span>
        </button>
      </div>

      {/* Right: Batch Effects Pickers */}
      <div className="w-full flex flex-col space-y-6">
        
        {/* Animation */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-light mb-1 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cta"></span>
            <span>Movimiento & Cámara (Lote)</span>
          </h4>
          <AnimationPicker
            value={defaultAnimation}
            onChange={onAnimationChangeSelected}
          />
          {!allAnimationsMatch && (
            <p className="text-[10px] text-gray-500">Los fotogramas seleccionados tienen animaciones distintas. Elige una para unificar.</p>
          )}
        </div>

        {/* Transition */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-light mb-1 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Transición (Lote)</span>
          </h4>
          <TransitionPicker
            value={defaultTransition}
            duration={defaultTransitionDuration}
            onChange={onTransitionChangeSelected}
            onDurationChange={onTransitionDurationChangeSelected}
          />
          {!allTransitionsMatch && (
            <p className="text-[10px] text-gray-500">Los fotogramas seleccionados tienen transiciones distintas. Elige una para unificar.</p>
          )}
        </div>

        {/* Color Filter */}
        <div className="md:col-span-2 space-y-4 pt-4 border-t border-dark-border/40">
          <h4 className="text-sm font-semibold text-light mb-1 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Filtro de Color (Lote)</span>
          </h4>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
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
                onClick={() => onFilterChangeSelected(f.value as FilterType)}
                className={`px-2 py-1.5 rounded-lg text-center text-[10px] font-semibold border transition-all duration-200 cursor-pointer
                  ${defaultFilter === f.value
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : 'bg-dark-bg border-dark-border/60 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!allFiltersMatch && (
            <p className="text-[10px] text-gray-500">Los fotogramas seleccionados tienen filtros distintos. Elige uno para unificar.</p>
          )}
        </div>

        {/* Image Adjustments (Batch) */}
        <div className="md:col-span-2 space-y-4 pt-4 border-t border-dark-border/40">
          <h4 className="text-sm font-semibold text-light flex items-center space-x-2">
            <Sun size={14} className="text-amber-400" />
            <span>Ajustes de Imagen (Lote)</span>
            <button
              onClick={() => onAdjustmentsChangeSelected(() => undefined)}
              className="ml-auto text-[9px] text-gray-500 hover:text-amber-400 flex items-center space-x-1 cursor-pointer"
              title="Restablecer ajustes en seleccionados"
            >
              <RotateCcw size={10} />
              <span>Restablecer</span>
            </button>
          </h4>
          {(() => {
            const defaultAdj: ImageAdjustments = { brightness: 1, contrast: 1, saturation: 1, exposure: 0, temperature: 0 };
            const isMixed = !selectedFrames.every(f => 
              JSON.stringify(f.adjustments || defaultAdj) === JSON.stringify(selectedFrames[0].adjustments || defaultAdj)
            );
            const adj = selectedFrames.length > 0 ? { ...defaultAdj, ...selectedFrames[0].adjustments } : defaultAdj;
            
            const updateAdj = (key: keyof ImageAdjustments, val: number) => {
              onAdjustmentsChangeSelected((prev) => ({
                ...(prev || defaultAdj),
                [key]: val
              }));
            };
            
            const sliders: { key: keyof ImageAdjustments; label: string; min: number; max: number; step: number }[] = [
              { key: 'brightness', label: 'Brillo', min: 0.5, max: 1.5, step: 0.01 },
              { key: 'contrast', label: 'Contraste', min: 0.5, max: 1.5, step: 0.01 },
              { key: 'saturation', label: 'Saturación', min: 0, max: 2, step: 0.01 },
              { key: 'exposure', label: 'Exposición', min: -0.5, max: 0.5, step: 0.01 },
              { key: 'temperature', label: 'Temperatura', min: -50, max: 50, step: 1 },
            ];
            
            return (
              <div className="space-y-2">
                {isMixed && (
                  <p className="text-[10px] text-amber-500/80 mb-2 leading-tight">
                    Los ajustes varían entre los fotogramas seleccionados. Mover un control los unificará.
                  </p>
                )}
                {sliders.map(s => (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-gray-400">{s.label}</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {isMixed ? 'Mix' : adj[s.key].toFixed(s.step < 1 ? 2 : 0)}
                      </span>
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
    </div>
  );
}
