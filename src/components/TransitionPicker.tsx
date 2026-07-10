import type { TransitionType } from '../types';
import { 
  Ban, Blend, ArrowRightFromLine, ArrowLeftFromLine, 
  ArrowUpFromLine, ArrowDownFromLine, PanelLeft, PanelRight 
} from 'lucide-react';

const transitions: { value: TransitionType; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Ninguna', icon: <Ban size={14} /> },
  { value: 'crossfade', label: 'Crossfade', icon: <Blend size={14} /> },
  { value: 'slide-left', label: 'Slide Izq.', icon: <ArrowLeftFromLine size={14} /> },
  { value: 'slide-right', label: 'Slide Der.', icon: <ArrowRightFromLine size={14} /> },
  { value: 'slide-up', label: 'Slide Arriba', icon: <ArrowUpFromLine size={14} /> },
  { value: 'slide-down', label: 'Slide Abajo', icon: <ArrowDownFromLine size={14} /> },
  { value: 'wipe-left', label: 'Wipe Izq.', icon: <PanelLeft size={14} /> },
  { value: 'wipe-right', label: 'Wipe Der.', icon: <PanelRight size={14} /> },
];

interface TransitionPickerProps {
  value: TransitionType;
  duration: number;
  onChange: (transition: TransitionType) => void;
  onDurationChange: (duration: number) => void;
}

export function TransitionPicker({ value, duration, onChange, onDurationChange }: TransitionPickerProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">Transición al siguiente</label>
      <div className="grid grid-cols-4 gap-1">
        {transitions.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            title={t.label}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] leading-tight transition-all duration-200 cursor-pointer
              ${value === t.value
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                : 'bg-dark-bg border border-dark-border text-gray-500 hover:text-gray-300 hover:border-gray-500'
              }`}
          >
            {t.icon}
            <span className="mt-0.5 truncate w-full text-center">{t.label}</span>
          </button>
        ))}
      </div>
      {value !== 'none' && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={duration}
            onChange={(e) => onDurationChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-dark-bg border border-dark-border rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="text-[10px] font-mono text-purple-400 w-8 text-right">{duration}s</span>
        </div>
      )}
    </div>
  );
}
