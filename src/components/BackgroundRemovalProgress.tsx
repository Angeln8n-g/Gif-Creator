import { X, Wand2, Loader2 } from 'lucide-react';

interface BackgroundRemovalProgressProps {
  isRemoving: boolean;
  progress: number;
  downloadProgress: number | null;
  currentFrame: number;
  totalFrames: number;
  onCancel: () => void;
}

export default function BackgroundRemovalProgress({ 
  isRemoving, 
  progress,
  downloadProgress,
  currentFrame,
  totalFrames,
  onCancel
}: BackgroundRemovalProgressProps) {
  if (!isRemoving) return null;

  const isDownloading = downloadProgress !== null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-secondary rounded-xl shadow-2xl max-w-md w-full border border-dark-border">
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-cta/20 p-2 rounded-lg">
              <Loader2 size={24} className="text-cta animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isDownloading ? 'Descargando Modelo' : 'Removiendo Fondos'}
              </h2>
              <p className="text-sm text-gray-400">
                {isDownloading 
                  ? 'Descargando modelo de IA...'
                  : `${currentFrame} de ${totalFrames} imágenes`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
            title="Cancelar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progreso</span>
              <span className="text-white font-medium">
                {isDownloading ? `${downloadProgress}%` : `${progress}%`}
              </span>
            </div>
            <div className="w-full h-3 bg-dark-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cta to-pink-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${isDownloading ? downloadProgress : progress}%` }}
              />
            </div>
          </div>

          {/* Info */}
          {isDownloading ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                📥 Descargando modelo de IA por primera vez (~50MB)
              </p>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-sm text-green-300">
                ✨ Procesando imágenes en paralelo para mayor velocidad
              </p>
            </div>
          )}

          {/* Estimated Time */}
          {!isDownloading && totalFrames > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Frame actual: {currentFrame}</span>
              <span>Restantes: {totalFrames - currentFrame}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-border flex justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg bg-dark-tertiary text-white hover:bg-red-600/20 hover:text-red-400 transition-colors border border-dark-border hover:border-red-500/30"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
