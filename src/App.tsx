import { useState, useRef, useEffect } from 'react';
import type { FrameImage, RenderSettings } from './types';
import { CollapsibleSettingsPanel } from './components/CollapsibleSettingsPanel';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { type PreviewPlayerRef } from './components/PreviewPlayer';
import { useFFmpeg } from './hooks/useFFmpeg';
import { useGifExtractor } from './hooks/useGifExtractor';
import { useBackgroundRemover } from './hooks/useBackgroundRemover';
import { useIsPanelOpen } from './hooks/useIsPanelOpen';
import { useHistoryState } from './hooks/useHistoryState';
import { Film, Undo2, Redo2 } from 'lucide-react';

function App() {
  const playerRef = useRef<PreviewPlayerRef>(null);
  const { 
    state: frames, 
    setState: setFrames, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistoryState<FrameImage[]>([]);
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
  const [audioTrack, setAudioTrack] = useState<File | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);

  const [isPanelOpen, togglePanel] = useIsPanelOpen();

  const { loaded, loadProgress, rendering, progress, renderMedia } = useFFmpeg();
  const { extractGifFrames } = useGifExtractor();
  const { isRemoving, progress: bgProgress, downloadProgress: bgDownloadProgress, removeBackgroundFromFrames } = useBackgroundRemover();

  // Global keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      );
      
      if (isTyping) return;

      if (e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleUpload = (newFrames: FrameImage[]) => {
    setFrames(prev => [...prev, ...newFrames]);
  };

  const handleGenerate = async () => {
    setResultUrl(null);
    const url = await renderMedia(frames, settings, audioTrack, audioVolume);
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

        {/* Undo/Redo Controls */}
        <div className="flex items-center space-x-1.5 bg-dark-card/50 border border-dark-border/50 p-1.5 rounded-xl backdrop-blur-md">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all duration-200"
          >
            <Undo2 size={18} />
          </button>
          <div className="w-[1px] h-4 bg-dark-border/50" />
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all duration-200"
          >
            <Redo2 size={18} />
          </button>
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
          ffmpegLoadProgress={loadProgress}
          onUpload={handleUpload}
          onVideoSelect={setSelectedVideo}
          onGifSelect={handleGifSelect}
          audioTrack={audioTrack}
          setAudioTrack={setAudioTrack}
          audioVolume={audioVolume}
          setAudioVolume={setAudioVolume}
          frames={frames}
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
          bgDownloadProgress={bgDownloadProgress}
          playerRef={playerRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onPlayStateChange={setIsPlaying}
          onTimeUpdate={setCurrentTime}
          onUpload={handleUpload}
          onResultDismiss={() => setResultUrl(null)}
          onResultDownload={handleDownload}
          onRemoveBackground={() => removeBackgroundFromFrames(frames, setFrames)}
          onClearFrames={() => setFrames([])}
          onVideoDismiss={() => setSelectedVideo(null)}
          audioTrack={audioTrack}
          audioVolume={audioVolume}
        />
      </div>
    </div>
  );
}

export default App;
