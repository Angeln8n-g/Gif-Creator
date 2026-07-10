import { Clapperboard, ArrowRightLeft, Type, Smile, Crop, CheckSquare, Square, CheckCheck, X, Copy } from 'lucide-react';
import type { EffectCategory, EffectMask, FrameImage } from '../types';
import { hasEffect } from '../utils/effectHelpers';

interface CopyEffectsMenuProps {
  sourceFrame: FrameImage;
  mask: EffectMask;
  onToggleCategory: (cat: EffectCategory) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

interface CategoryConfig {
  id: EffectCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
  inactiveIcon: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'animation',
    label: 'Animación',
    description: 'Movimiento de cámara',
    icon: <Clapperboard size={16} />,
    activeColor: 'text-cta',
    activeBg: 'bg-cta/10',
    activeBorder: 'border-cta/30',
    inactiveIcon: 'text-gray-500',
  },
  {
    id: 'transition',
    label: 'Transición',
    description: 'Efecto entre frames',
    icon: <ArrowRightLeft size={16} />,
    activeColor: 'text-purple-400',
    activeBg: 'bg-purple-500/10',
    activeBorder: 'border-purple-500/30',
    inactiveIcon: 'text-gray-500',
  },
  {
    id: 'text',
    label: 'Texto',
    description: 'Texto superpuesto',
    icon: <Type size={16} />,
    activeColor: 'text-blue-400',
    activeBg: 'bg-blue-500/10',
    activeBorder: 'border-blue-500/30',
    inactiveIcon: 'text-gray-500',
  },
  {
    id: 'stickers',
    label: 'Stickers',
    description: 'Emojis y stickers',
    icon: <Smile size={16} />,
    activeColor: 'text-amber-400',
    activeBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/30',
    inactiveIcon: 'text-gray-500',
  },
  {
    id: 'crop',
    label: 'Recorte',
    description: 'Forma y máscara',
    icon: <Crop size={16} />,
    activeColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/30',
    inactiveIcon: 'text-gray-500',
  },
];

export function CopyEffectsMenu({
  sourceFrame,
  mask,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
  onConfirm,
  onCancel,
}: CopyEffectsMenuProps) {
  const hasAnyEffect = CATEGORIES.some((cat) => hasEffect(sourceFrame, cat.id));
  const noneSelected = mask.size === 0;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl shadow-lg shadow-black/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cta/10 text-cta">
            <Copy size={14} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-light">Copiar efectos</h3>
            <p className="text-[10px] text-gray-500">Selecciona las categorías a copiar</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-dark-bg/60 transition-colors cursor-pointer"
          aria-label="Cancelar copia de efectos"
        >
          <X size={14} />
        </button>
      </div>

      {/* No-effects warning */}
      {!hasAnyEffect && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span>No hay efectos para copiar en este frame.</span>
        </div>
      )}

      {/* Category toggles */}
      <div className="p-4 space-y-2">
        {CATEGORIES.map((cat) => {
          const isActive = hasEffect(sourceFrame, cat.id);
          const isSelected = mask.has(cat.id);
          const isDisabled = !hasAnyEffect;

          return (
            <button
              key={cat.id}
              onClick={() => !isDisabled && onToggleCategory(cat.id)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left
                ${isDisabled
                  ? 'opacity-40 cursor-not-allowed bg-dark-bg/30 border-dark-border'
                  : isSelected
                    ? `cursor-pointer ${cat.activeBg} ${cat.activeBorder} hover:opacity-90`
                    : 'cursor-pointer bg-dark-bg/50 border-dark-border hover:border-gray-600 hover:bg-dark-bg/70'
                }`}
            >
              {/* Checkbox indicator */}
              <div className={`flex-shrink-0 transition-colors ${isSelected && !isDisabled ? cat.activeColor : 'text-gray-600'}`}>
                {isSelected && !isDisabled ? <CheckSquare size={16} /> : <Square size={16} />}
              </div>

              {/* Category icon */}
              <div className={`flex-shrink-0 p-1.5 rounded-lg transition-colors
                ${isDisabled
                  ? 'bg-dark-bg text-gray-600'
                  : isSelected
                    ? `${cat.activeBg} ${cat.activeColor}`
                    : `bg-dark-bg ${cat.inactiveIcon}`
                }`}
              >
                {cat.icon}
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-medium block transition-colors
                  ${isDisabled ? 'text-gray-600' : isSelected ? cat.activeColor : 'text-gray-300'}`}
                >
                  {cat.label}
                </span>
                <span className="text-[10px] text-gray-500">{cat.description}</span>
              </div>

              {/* Active-effect badge */}
              {isActive && !isDisabled && (
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  isSelected ? cat.activeColor.replace('text-', 'bg-') : 'bg-gray-600'
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick-action row */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={onSelectAll}
          disabled={!hasAnyEffect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 bg-dark-bg/50 hover:bg-dark-bg border border-dark-border hover:border-gray-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck size={12} />
          Seleccionar todo
        </button>
        <button
          onClick={onDeselectAll}
          disabled={!hasAnyEffect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 bg-dark-bg/50 hover:bg-dark-bg border border-dark-border hover:border-gray-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Square size={12} />
          Deseleccionar todo
        </button>
      </div>

      {/* Footer: hint + confirm/cancel */}
      <div className="px-4 pb-4 border-t border-dark-border pt-3 space-y-2">
        {noneSelected && hasAnyEffect && (
          <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
            <span>⚠</span>
            <span>Selecciona al menos una categoría para continuar.</span>
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 bg-dark-bg/50 hover:bg-dark-bg border border-dark-border hover:border-gray-600 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={noneSelected || !hasAnyEffect}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-cta hover:bg-cta/90 text-dark-bg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar selección
          </button>
        </div>
      </div>
    </div>
  );
}
