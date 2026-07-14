import { Loader2, Sparkles, X, Image as ImageIcon, Wand2 } from 'lucide-react';
import type { FrameImage, RenderSettings } from '../types';
import { PreviewPlayer, type PreviewPlayerRef } from './PreviewPlayer';
import { VideoTrimmer } from './VideoTrimmer';
import { TimelineEditor } from './TimelineEditor';
import { AudioWaveform } from './AudioWaveform';
import { CanvasEditor } from '../canvas/CanvasEditor';
import type React from 'react';

interface CanvasWorkspaceProps {
  frames: FrameImage[];
  settings: RenderSettings;
  resultUrl: string | null;
  isExtractingGif: boolean;
  selectedVideo: File | null;
  isRemoving: boolean;
  bgProgress: number;
  bgDownloadProgress: number | null;
  playerRef: React.RefObject<PreviewPlayerRef | null>;
  isPlaying: boolean;
  currentTime: number;
  audioTrack: File | null;
  audioVolume: number;
  onPlayStateChange: (playing: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onUpload: (frames: FrameImage[]) => void;
  onResultDismiss: () => void;
  onResultDownload: () => void;
  onRemoveBackground: () => void;
  onClearFrames: () => void;
  /** Dismiss the VideoTrimmer modal (cancel or after extract) */
  onVideoDismiss: () => void;
  /** Required by TimelineEditor for frame mutations (reorder, edit, delete) */
  setFrames: React.Dispatch<React.SetStateAction<FrameImage[]>>;
  onReverseTimeline?: () => void;
  onBoomerangTimeline?: () => void;
  selectedFrameIndex: number | null;
  setSelectedFrameIndex: (idx: number | null) => void;
  selectedFrameIds: Set<string>;
  setSelectedFrameIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  lastSelectedId: string | null;
  setLastSelectedId: (id: string | null) => void;
}

export function CanvasWorkspace({
  frames,
  settings,
  resultUrl,
  isExtractingGif,
  selectedVideo,
  isRemoving,
  bgProgress,
  bgDownloadProgress,
  playerRef,
  isPlaying,
  currentTime,
  onPlayStateChange,
  onTimeUpdate,
  onUpload,
  onResultDismiss,
  onResultDownload,
  onRemoveBackground,
  onClearFrames,
  onVideoDismiss,
  setFrames,
  audioTrack,
  audioVolume,
  onReverseTimeline,
  onBoomerangTimeline,
  selectedFrameIndex,
  setSelectedFrameIndex,
  selectedFrameIds,
  setSelectedFrameIds,
  lastSelectedId,
  setLastSelectedId
}: CanvasWorkspaceProps) {
  // Determine which canvas state to render — mutually exclusive
  const showEmpty = frames.length === 0 && !isExtractingGif;
  const showSpinner = isExtractingGif;
  const showPlayer = frames.length > 0 && !isExtractingGif && selectedFrameIndex === null;
  const showCanvasEditor = frames.length > 0 && !isExtractingGif && selectedFrameIndex !== null;


  return (
    <div className="flex-1 flex flex-col space-y-6 min-w-0">

      {/* ── Result Banner ── shown inline above canvas when a result exists */}
      {resultUrl !== null && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl shadow-black/40 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cta to-purple-600" />
          <button
            onClick={onResultDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-light transition-colors cursor-pointer"
            aria-label="Cerrar resultado"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Preview */}
            <div className="w-full md:w-1/2 flex justify-center bg-black/50 rounded-xl overflow-hidden border border-dark-border shadow-inner">
              {settings.format === 'mp4' ? (
                <video
                  src={resultUrl}
                  controls
                  autoPlay
                  loop
                  className="max-h-[300px] w-auto object-contain"
                />
              ) : (
                <img
                  src={resultUrl}
                  alt="Generated GIF"
                  className="max-h-[300px] w-auto object-contain"
                />
              )}
            </div>

            {/* Actions */}
            <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium border border-green-500/20">
                <Sparkles size={16} />
                <span>¡Renderizado completado!</span>
              </div>
              <h3 className="text-xl font-bold text-light">Tu archivo está listo</h3>
              <p className="text-gray-400 text-sm">
                El {settings.format.toUpperCase()} se generó correctamente. Puedes descargarlo a tu dispositivo.
              </p>
              <button
                onClick={onResultDownload}
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-cta text-light font-bold rounded-xl hover:bg-cta-hover transition-colors shadow-lg shadow-cta/20 cursor-pointer"
              >
                Descargar Archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas area ── exactly one of three mutually exclusive states */}

      {/* State 1: Empty drop zone */}
      {showEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-dark-border rounded-2xl bg-dark-card/50 shadow-inner">
          <div className="w-16 h-16 bg-dark-bg border border-dark-border rounded-full flex items-center justify-center mb-4 shadow-sm">
            <ImageIcon className="text-gray-500" size={32} />
          </div>
          <p className="text-gray-300 font-medium text-lg">Aún no hay imágenes</p>
          <p className="text-gray-500 mt-1 max-w-sm">
            Sube algunas imágenes para comenzar a crear tu GIF animado o video.
          </p>
        </div>
      )}

      {/* State 2: GIF extraction spinner */}
      {showSpinner && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 shadow-inner">
          <Loader2 className="w-10 h-10 text-cta animate-spin" />
          <p className="text-light font-medium text-lg">Remixando GIF...</p>
          <p className="text-sm text-gray-500">Extrayendo fotogramas individualmente</p>
        </div>
      )}

      {/* State 3: Preview player */}
      {showPlayer && (
        <PreviewPlayer
          ref={playerRef}
          frames={frames}
          globalSpeed={settings.globalSpeed}
          onTimeUpdate={onTimeUpdate}
          isPlaying={isPlaying}
          onPlayStateChange={onPlayStateChange}
          audioTrack={audioTrack}
          audioVolume={audioVolume}
          watermarkText={settings.watermarkText}
          watermarkOpacity={settings.watermarkOpacity}
          watermarkPosition={settings.watermarkPosition}
        />
      )}

      {/* State 4: Canvas Editor */}
      {showCanvasEditor && selectedFrameIndex !== null && (
        <CanvasEditor
          frame={frames[selectedFrameIndex]}
          onFrameUpdate={(updatedFrame) => {
            setFrames((prev) =>
              prev.map((f, idx) => (idx === selectedFrameIndex ? updatedFrame : f))
            );
          }}
          onClose={() => setSelectedFrameIndex(null)}
        />
      )}

      {/* ── VideoTrimmer modal ── shown when a video file is selected */}
      {selectedVideo !== null && (
        <VideoTrimmer
          file={selectedVideo}
          onCancel={onVideoDismiss}
          onExtract={(newFrames) => {
            onUpload(newFrames);
            onVideoDismiss();
          }}
        />
      )}

      {/* ── Timeline / Gallery ── shown below canvas when frames exist */}
      {frames.length > 0 && (
        <div className="tour-timeline bg-dark-card border border-dark-border rounded-2xl overflow-hidden w-full max-w-full min-w-0">
          {/* Gallery header with action buttons */}
          <div className="p-4 border-b border-dark-border flex justify-between items-center">
            <h3 className="text-lg font-medium text-white flex items-center space-x-2">
              <span>Secuencia de Imágenes</span>
              <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                {frames.length}
              </span>
            </h3>
            <div className="flex items-center space-x-4">
              {/* Remove background button */}
              <button
                onClick={onRemoveBackground}
                disabled={isRemoving}
                className="flex items-center space-x-2 text-sm text-cta hover:text-cta-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Remover fondo de todos los frames usando IA"
              >
                {isRemoving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wand2 size={16} />
                )}
                <span className="hidden sm:inline">
                  {isRemoving
                    ? bgDownloadProgress !== null
                      ? `Descargando modelo... ${bgDownloadProgress}%`
                      : `Procesando... ${bgProgress}%`
                    : 'Quitar Fondo (IA)'
                  }
                </span>
              </button>

              {/* Clear all frames button */}
              <button
                onClick={onClearFrames}
                className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                Limpiar todo
              </button>
            </div>
          </div>

          {/* Timeline editor */}
          <TimelineEditor
            frames={frames}
            setFrames={setFrames}
            currentTime={currentTime}
            playerRef={playerRef}
            onReverseTimeline={onReverseTimeline}
            onBoomerangTimeline={onBoomerangTimeline}
            selectedFrameIndex={selectedFrameIndex}
            setSelectedFrameIndex={setSelectedFrameIndex}
            selectedIds={selectedFrameIds}
            setSelectedIds={setSelectedFrameIds}
            lastSelectedId={lastSelectedId}
            setLastSelectedId={setLastSelectedId}
          />
          
          <AudioWaveform
            audioTrack={audioTrack}
            audioVolume={audioVolume}
            isPlaying={isPlaying}
            currentTime={currentTime}
            totalDuration={frames.reduce((acc, f) => acc + f.duration, 0)}
          />
        </div>
      )}
    </div>
  );
}
