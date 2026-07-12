import type { AnimationType } from '../types';
import { 
  ZoomIn, ZoomOut, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, 
  RotateCw, RotateCcw, Layers, ArrowUpDown, Eye, EyeOff, Ban
} from 'lucide-react';
import { FloatingWrapper } from './FloatingWrapper';

const animations: { value: AnimationType; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Ninguna', icon: <Ban size={14} /> },
  { value: 'zoom-in', label: 'Zoom In', icon: <ZoomIn size={14} /> },
  { value: 'zoom-out', label: 'Zoom Out', icon: <ZoomOut size={14} /> },
  { value: 'pan-left', label: 'Pan Izq.', icon: <ArrowLeft size={14} /> },
  { value: 'pan-right', label: 'Pan Der.', icon: <ArrowRight size={14} /> },
  { value: 'pan-up', label: 'Pan Arriba', icon: <ArrowUp size={14} /> },
  { value: 'pan-down', label: 'Pan Abajo', icon: <ArrowDown size={14} /> },
  { value: 'fade-in', label: 'Fade In', icon: <Eye size={14} /> },
  { value: 'fade-out', label: 'Fade Out', icon: <EyeOff size={14} /> },
  { value: 'rotate-cw', label: 'Rotar →', icon: <RotateCw size={14} /> },
  { value: 'rotate-ccw', label: 'Rotar ←', icon: <RotateCcw size={14} /> },
  { value: 'parallax', label: 'Parallax', icon: <Layers size={14} /> },
  { value: 'bounce', label: 'Bounce', icon: <ArrowUpDown size={14} /> },
];

interface AnimationPickerProps {
  value: AnimationType;
  onChange: (animation: AnimationType) => void;
}

export function AnimationPicker({ value, onChange }: AnimationPickerProps) {
  return (
    <FloatingWrapper
      title="Movimiento & Cámara"
      defaultFloating={false} // Docked by default
      width="340px"
      themeColor="cta"
      defaultPositionOffset={{ x: 380, y: 390 }}
    >
      <div className="grid grid-cols-4 gap-1">
        {animations.map((anim) => (
          <button
            key={anim.value}
            onClick={() => onChange(anim.value)}
            title={anim.label}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] leading-tight transition-all duration-200 cursor-pointer
              ${value === anim.value
                ? 'bg-cta/20 text-cta border border-cta/40 shadow-[0_0_8px_rgba(225,29,72,0.15)]'
                : 'bg-dark-bg border border-dark-border text-gray-500 hover:text-gray-300 hover:border-gray-500'
              }`}
          >
            {anim.icon}
            <span className="mt-0.5 truncate w-full text-center">{anim.label}</span>
          </button>
        ))}
      </div>
    </FloatingWrapper>
  );
}
