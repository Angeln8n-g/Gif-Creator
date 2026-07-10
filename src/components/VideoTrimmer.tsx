import { useState, useRef, useEffect } from 'react';
import { Scissors, Play, Pause, Loader2 } from 'lucide-react';
import { useMediaExtractor } from '../hooks/useMediaExtractor';
import type { FrameImage } from '../types';

interface VideoTrimmerProps {
  file: File;
  onExtract: (frames: FrameImage[]) => void;
  onCancel: () => void;
}

export function VideoTrimmer({ file, onExtract, onCancel }: VideoTrimmerProps) {
  const [videoUrl] = useState(() => URL.createObjectURL(file));
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [fps, setFps] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);

  const { extractVideoFrames } = useMediaExtractor();

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setEndTime(Math.min(d, 5)); // Default to first 5 seconds
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      if (current >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const extracted = await extractVideoFrames(
        file,
        startTime,
        endTime,
        fps,
        (progress) => setExtractProgress(Math.round(progress * 100))
      );

      const frameDuration = 1 / fps;
      const newFrames: FrameImage[] = extracted.map(e => ({
        id: crypto.randomUUID(),
        file: e.file,
        previewUrl: e.previewUrl,
        duration: frameDuration,
        animation: 'none',
        transition: 'none',
        transitionDuration: 0.5,
        stickers: []
      }));

      onExtract(newFrames);
    } catch (err) {
      console.error(err);
      alert("Error extrayendo frames del video.");
    } finally {
      setIsExtracting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const estimatedFrames = Math.floor((endTime - startTime) * fps);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-dark-border flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Scissors className="text-cta" />
            Quick GIF Mode (Convertir Video)
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors cursor-pointer">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Video Preview */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-dark-border/50">
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="max-h-full max-w-full"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors opacity-0 hover:opacity-100 group cursor-pointer"
            >
              <div className="bg-cta p-4 rounded-full text-white transform scale-90 group-hover:scale-100 transition-all shadow-lg shadow-cta/30">
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </div>
            </button>
          </div>

          {/* Trimming Controls */}
          <div className="space-y-4 bg-dark-bg p-5 rounded-xl border border-dark-border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-400">Recortar fragmento:</span>
              <span className="text-sm font-mono text-cta bg-cta/10 px-2 py-0.5 rounded-md">
                {(endTime - startTime).toFixed(1)}s seleccionados
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono w-12 text-right">{formatTime(startTime)}</span>
              <div className="flex-1 relative h-2">
                {/* Visual duration bar */}
                <div className="absolute inset-0 bg-dark-border rounded-full" />
                <div 
                  className="absolute h-full bg-cta rounded-full"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }}
                />
                
                {/* Start slider */}
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val < endTime) {
                      setStartTime(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {/* End slider */}
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > startTime) {
                      setEndTime(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-xs font-mono w-12">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-bg p-4 rounded-xl border border-dark-border">
              <label className="block text-sm font-medium text-gray-400 mb-2">Cuadros por segundo (FPS)</label>
              <div className="flex gap-2">
                {[5, 10, 15].map(v => (
                  <button
                    key={v}
                    onClick={() => setFps(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      fps === v
                        ? 'bg-cta/20 text-cta border border-cta/40 shadow-[0_0_10px_rgba(225,29,72,0.15)]'
                        : 'bg-dark-card border border-dark-border text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {v} FPS
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-dark-bg p-4 rounded-xl border border-dark-border flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-400">Total de imágenes:</span>
                <span className="text-lg font-bold text-white">{estimatedFrames}</span>
              </div>
              <p className="text-xs text-gray-500">
                Se extraerán {estimatedFrames} frames para la edición. Un número muy alto puede ralentizar el navegador.
              </p>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleExtract}
            disabled={isExtracting || estimatedFrames <= 0}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 bg-cta hover:bg-cta-hover text-white transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isExtracting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Extrayendo {extractProgress}%...</span>
              </>
            ) : (
              <>
                <Scissors size={20} />
                <span>Extraer y Continuar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
