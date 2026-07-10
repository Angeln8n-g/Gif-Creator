import { ClipboardPaste, Users, CheckCheck, X } from 'lucide-react';
import type { EffectMask } from '../types';

interface EffectsStatusBannerProps {
  /** 1-based index of the source frame */
  sourceIndex: number;
  mask: EffectMask;
  targetCount: number;
  onPasteToSelected: () => void;
  onPasteToAll: () => void;
  onSelectAllTargets: () => void;
  onCancel: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  animation: 'Animación',
  transition: 'Transición',
  text: 'Texto',
  stickers: 'Stickers',
  crop: 'Recorte',
};

export function EffectsStatusBanner({
  sourceIndex,
  mask,
  targetCount,
  onPasteToSelected,
  onPasteToAll,
  onSelectAllTargets,
  onCancel,
}: EffectsStatusBannerProps) {
  const maskEmpty = mask.size === 0;
  const activeCategories = [...mask].map((cat) => CATEGORY_LABELS[cat] ?? cat);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-dark-card border border-cta/30 rounded-xl shadow-lg shadow-black/20">
      {/* Source info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 shrink-0">
          <ClipboardPaste size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-light leading-tight">
            Frame {sourceIndex} copiado
          </p>
          {activeCategories.length > 0 ? (
            <p className="text-[10px] text-gray-400 truncate">
              {activeCategories.join(' · ')}
            </p>
          ) : (
            <p className="text-[10px] text-amber-400/70">Sin categorías seleccionadas</p>
          )}
        </div>
      </div>

      {/* Target count badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-bg/60 border border-dark-border text-xs text-gray-300">
        <Users size={12} className="text-gray-400" />
        <span>
          {targetCount} {targetCount === 1 ? 'destino' : 'destinos'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        <button
          onClick={onSelectAllTargets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 bg-dark-bg/50 hover:bg-dark-bg border border-dark-border hover:border-gray-600 transition-colors cursor-pointer"
        >
          <CheckCheck size={12} />
          Seleccionar todos
        </button>

        <button
          onClick={onPasteToSelected}
          disabled={maskEmpty || targetCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-200 bg-dark-bg/70 hover:bg-dark-bg border border-dark-border hover:border-gray-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardPaste size={12} />
          Pegar en selección
        </button>

        <button
          onClick={onPasteToAll}
          disabled={maskEmpty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cta hover:bg-cta/90 text-dark-bg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardPaste size={12} />
          Pegar en todos
        </button>

        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-dark-bg/60 transition-colors cursor-pointer"
          aria-label="Cancelar pegado de efectos"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
