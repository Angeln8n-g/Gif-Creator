import type { FrameImage, AnimationType, TransitionType, FilterType } from '../types';
import { AnimationPicker } from './AnimationPicker';
import { TransitionPicker } from './TransitionPicker';
import { Trash2 } from 'lucide-react';

interface BatchFrameInspectorProps {
  selectedFrames: FrameImage[];
  onRemoveSelected: () => void;
  onDurationChangeSelected: (duration: number) => void;
  onAnimationChangeSelected: (animation: AnimationType) => void;
  onTransitionChangeSelected: (transition: TransitionType) => void;
  onTransitionDurationChangeSelected: (duration: number) => void;
  onFilterChangeSelected: (filter: FilterType) => void;
}

export function BatchFrameInspector({
  selectedFrames,
  onRemoveSelected,
  onDurationChangeSelected,
  onAnimationChangeSelected,
  onTransitionChangeSelected,
  onTransitionDurationChangeSelected,
  onFilterChangeSelected,
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
    <div className="bg-dark-card border border-dark-border rounded-xl flex flex-col md:flex-row overflow-hidden shadow-lg shadow-black/20">
      
      {/* Left: Selected Frames Overview */}
      <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-dark-border flex flex-col space-y-4">
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
      <div className="w-full md:w-2/3 p-4 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[400px] md:max-h-[500px] custom-scrollbar">
        
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

      </div>
    </div>
  );
}
