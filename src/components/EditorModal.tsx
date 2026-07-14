import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  accentColor: string;       // e.g. 'emerald', 'blue', 'amber'
  preview?: React.ReactNode;
  children: React.ReactNode;
}

export function EditorModal({
  isOpen,
  onClose,
  title,
  icon,
  accentColor,
  preview,
  children,
}: EditorModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const accentMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.08)]',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.08)]',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.08)]',
    },
  };

  const accent = accentMap[accentColor] || accentMap.emerald;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-dark-card/95 backdrop-blur-xl rounded-2xl border ${accent.border} ${accent.glow} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b border-dark-border/50 ${accent.bg}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${accent.bg} ${accent.text}`}>
              {icon}
            </div>
            <h3 className="text-sm font-semibold text-light">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
          {/* Preview Panel */}
          {preview && (
            <div className="w-full lg:w-1/2 p-4 lg:p-5 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-dark-border/30">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vista Previa en Vivo</span>
              </div>
              <div className="flex-1 flex items-center justify-center bg-black/30 rounded-xl p-3 min-h-[200px]">
                {preview}
              </div>
            </div>
          )}

          {/* Editor Panel */}
          <div className={preview ? "w-full lg:w-1/2 p-4 lg:p-5 overflow-y-auto custom-scrollbar max-h-[50vh] lg:max-h-none" : "w-full p-4 lg:p-5 overflow-y-auto custom-scrollbar"}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
