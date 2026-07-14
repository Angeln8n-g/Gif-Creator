import { useState } from 'react';
import { X, Wand2, Zap, Scale, Sparkles } from 'lucide-react';
import type { BackgroundRemovalQuality } from '../hooks/useBackgroundRemover';

interface BackgroundRemovalModalProps {
  onConfirm: (quality: BackgroundRemovalQuality, batchSize: number) => void;
  onCancel: () => void;
  frameCount: number;
}

export default function BackgroundRemovalModal({ 
  onConfirm, 
  onCancel,
  frameCount 
}: BackgroundRemovalModalProps) {
  const [quality, setQuality] = useState<BackgroundRemovalQuality>('balanced');
  const [batchSize, setBatchSize] = useState(2);

  const qualityOptions: Array<{
    value: BackgroundRemovalQuality;
    label: string;
    icon: typeof Zap;
    description: string;
    estimatedTime: string;
  }> = [
    {
      value: 'fast',
      label: 'Rápido',
      icon: Zap,
      description: 'Procesa más rápido con calidad decente',
      estimatedTime: `~${Math.ceil(frameCount * 1.5 / batchSize)}s`
    },
    {
      value: 'balanced',
      label: 'Balanceado',
      icon: Scale,
      description: 'Balance ideal entre velocidad y calidad',
      estimatedTime: `~${Math.ceil(frameCount * 2.5 / batchSize)}s`
    },
    {
      value: 'high',
      label: 'Alta Calidad',
      icon: Sparkles,
      description: 'Mejor calidad, toma más tiempo',
      estimatedTime: `~${Math.ceil(frameCount * 4 / batchSize)}s`
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-secondary rounded-xl shadow-2xl max-w-md w-full border border-dark-border">
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-cta/20 p-2 rounded-lg">
              <Wand2 size={24} className="text-cta" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Quitar Fondo con IA</h2>
              <p className="text-sm text-gray-400">{frameCount} imágenes</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Calidad de Procesamiento
            </label>
            <div className="space-y-2">
              {qualityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = quality === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setQuality(option.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-cta bg-cta/10'
                        : 'border-dark-border bg-dark-tertiary hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-0.5 ${isSelected ? 'text-cta' : 'text-gray-400'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {option.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {option.estimatedTime}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Batch Size */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-white">
                Procesamiento Paralelo
              </label>
              <span className="text-sm text-gray-400">{batchSize} a la vez</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full h-2 bg-dark-tertiary rounded-lg appearance-none cursor-pointer accent-cta"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Más lento</span>
              <span>Más rápido</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Mayor paralelismo = más rápido, pero usa más memoria
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              ℹ️ El modelo de IA se descargará automáticamente (solo la primera vez ~50MB)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-border flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg bg-dark-tertiary text-white hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(quality, batchSize)}
            className="px-6 py-2 rounded-lg bg-cta text-dark-primary font-medium hover:bg-cta-hover transition-colors flex items-center space-x-2"
          >
            <Wand2 size={18} />
            <span>Procesar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
