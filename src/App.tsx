import { useState, useRef } from 'react';
import type { FrameImage, RenderSettings } from './types';
import { CollapsibleSettingsPanel } from './components/CollapsibleSettingsPanel';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { type PreviewPlayerRef } from './components/PreviewPlayer';
import { useFFmpeg } from './hooks/useFFmpeg';
import { useGifExtractor } from './hooks/useGifExtractor';
import { useBackgroundRemover } from './hooks/useBackgroundRemover';
import { useIsPanelOpen } from './hooks/useIsPanelOpen';
import { Film } from 'lucide-react';

function App() {
  const playerRef = useRef<PreviewPlayerRef>(null);
  const [frames, setFrames] = useState<FrameImage[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [settings, setSettings] = useState<RenderSettings>({
    format: 'gif',
    resolution: '720p',
    globalSpeed: 1,
    optimization: 'medium',
  });
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isExtractingGif, setIsExtractingGif] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isPanelOpen, togglePanel] = useIsPanelOpen();

  const { loaded, rendering, progress, renderMedia } = useFFmpeg();
  const { extractGifFrames } = useGifExtractor();
  const { isRemoving, progress: bgProgress, removeBackgroundFromFrames } = useBackgroundRemover();

  const handleUpload = (newFrames: FrameImage[]) => {
    setFrames(prev => [...prev, ...newFrames]);
  };

  const handleGenerate = async () => {
    setResultUrl(null);
    const url = await renderMedia(frames, settings);
    if (url) {
      setResultUrl(url);
    }
  };

  const handleGifSelect = async (file: File) => {
    try {
      setIsExtractingGif(true);
      const gifFrames = await extractGifFrames(file);
      handleUpload(gifFrames);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al extraer el GIF');
    } finally {
      setIsExtractingGif(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `creacion.${settings.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-cta p-2.5 rounded-xl shadow-lg shadow-cta/20 transition-transform hover:scale-105 duration-300">
            <Film className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-light tracking-tight">GifCreatorPro</h1>
            <p className="text-sm text-gray-400 font-medium">Creador de GIF y Video Profesional</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-8">
        {/* Left: Collapsible Settings Panel */}
        <CollapsibleSettingsPanel
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          settings={settings}
          setSettings={setSettings}
          onGenerate={handleGenerate}
          isRendering={rendering}
          progress={progress}
          hasFrames={frames.length > 0}
          isFfmpegLoaded={loaded}
        />

        {/* Right: Canvas Workspace */}
        <CanvasWorkspace
          frames={frames}
          setFrames={setFrames}
          settings={settings}
          resultUrl={resultUrl}
          isExtractingGif={isExtractingGif}
          selectedVideo={selectedVideo}
          isRemoving={isRemoving}
          bgProgress={bgProgress}
          playerRef={playerRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onPlayStateChange={setIsPlaying}
          onTimeUpdate={setCurrentTime}
          onUpload={handleUpload}
          onVideoSelect={setSelectedVideo}
          onGifSelect={handleGifSelect}
          onResultDismiss={() => setResultUrl(null)}
          onResultDownload={handleDownload}
          onRemoveBackground={() => removeBackgroundFromFrames(frames, setFrames)}
          onClearFrames={() => setFrames([])}
          onVideoDismiss={() => setSelectedVideo(null)}
        />
      </div>
    </div>
  );
}

export default App;
