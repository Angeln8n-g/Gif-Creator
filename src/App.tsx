import { useState, useRef, useEffect, useCallback } from 'react';
import type { FrameImage, RenderSettings } from './types';
import { CollapsibleSettingsPanel } from './components/CollapsibleSettingsPanel';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { type PreviewPlayerRef } from './components/PreviewPlayer';
import { useFFmpeg } from './hooks/useFFmpeg';
import { useGifExtractor } from './hooks/useGifExtractor';
import { useBackgroundRemover } from './hooks/useBackgroundRemover';
import { useIsPanelOpen } from './hooks/useIsPanelOpen';
import { useHistoryState } from './hooks/useHistoryState';
import { Logo } from './components/Logo';
import { Undo2, Redo2 } from 'lucide-react';
import { saveProject, loadProject, clearProject, type SavedProject } from './services/indexedDb';
import { OnboardingTour } from './components/OnboardingTour';
import { RenderProgressModal } from './components/RenderProgressModal';
import { FrameInspector } from './components/FrameInspector';
import { BatchFrameInspector } from './components/BatchFrameInspector';
import { generateId } from './utils/generateId';

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
  const [restorableProject, setRestorableProject] = useState<SavedProject | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFrameIndex !== null && selectedFrameIndex >= frames.length) {
      setSelectedFrameIndex(null);
    }
  }, [frames.length, selectedFrameIndex]);

  // Sincronizar selección inicial: Auto-seleccionar primer fotograma si no hay selección
  useEffect(() => {
    setSelectedFrameIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (frames.some((f) => f.id === id)) {
          next.add(id);
        }
      });
      
      if (next.size === 0 && frames.length > 0) {
        next.add(frames[0].id);
        setLastSelectedId(frames[0].id);
      }
      return next;
    });
  }, [frames]);

  // Handlers genéricos de mutación para el Inspector de Propiedades
  const handleUpdateFrame = useCallback((id: string, updatedFields: Partial<FrameImage>) => {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, ...updatedFields } : f)));
  }, [setFrames]);

  const handleUpdateSelectedFrames = useCallback((updatedFields: Partial<FrameImage> | ((f: FrameImage) => Partial<FrameImage>)) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (selectedFrameIds.has(f.id)) {
          const fields = typeof updatedFields === 'function' ? updatedFields(f) : updatedFields;
          return { ...f, ...fields };
        }
        return f;
      })
    );
  }, [selectedFrameIds, setFrames]);

  const handleRemoveFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [setFrames]);

  const handleRemoveSelectedFrames = useCallback(() => {
    setFrames((prev) => prev.filter((f) => !selectedFrameIds.has(f.id)));
    setSelectedFrameIds(new Set());
  }, [selectedFrameIds, setFrames]);

  const [isPanelOpen, togglePanel] = useIsPanelOpen();
  const [runTour, setRunTour] = useState(false);

  const { loaded, loadProgress, rendering, progress, renderMedia } = useFFmpeg();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('gifCreatorHasSeenTour');
    if (!hasSeenTour) {
      setRunTour(true);
    }
  }, []);

  const handleTourFinish = () => {
    localStorage.setItem('gifCreatorHasSeenTour', 'true');
    setRunTour(false);
  };

  // Check for saved project on mount
  useEffect(() => {
    async function checkSaved() {
      const saved = await loadProject();
      if (saved && saved.frames && saved.frames.length > 0) {
        setRestorableProject(saved);
      }
    }
    checkSaved();
  }, []);

  const handleRestoreSession = () => {
    if (!restorableProject) return;
    
    // Reconstruct Blob URLs
    const restoredFrames: FrameImage[] = restorableProject.frames.map(f => {
      const previewUrl = URL.createObjectURL(f.file);
      const sfx = f.sfx ? {
        name: f.sfx.name,
        file: f.sfx.file,
        volume: f.sfx.volume,
        start: f.sfx.start,
        end: f.sfx.end,
        url: URL.createObjectURL(f.sfx.file)
      } : undefined;
      
      return {
        id: f.id,
        file: f.file,
        previewUrl,
        duration: f.duration,
        animation: f.animation,
        filter: f.filter,
        transition: f.transition,
        transitionDuration: f.transitionDuration,
        text: f.text,
        stickers: f.stickers.map((st: any) => {
          if (st.type === 'custom' && st.file) {
            return { ...st, url: URL.createObjectURL(st.file) };
          }
          return st;
        }),
        crop: f.crop,
        sfx
      };
    });

    setFrames(restoredFrames, true); // skipHistory = true
    setSettings(restorableProject.settings);
    setAudioTrack(restorableProject.audioTrack);
    setAudioVolume(restorableProject.audioVolume);
    setRestorableProject(null);
  };

  const handleDiscardSession = async () => {
    await clearProject();
    setRestorableProject(null);
  };

  const handleReverseTimeline = () => {
    if (frames.length < 2) return;
    setFrames([...frames].reverse());
  };

  const handleBoomerangTimeline = () => {
    if (frames.length < 2) return;
    // Duplicate frames in reverse order excluding first and last to avoid stutter at loop point
    const reversed = [...frames].reverse().slice(1, -1).map(f => ({
      ...f,
      id: generateId() // New IDs to avoid key conflicts
    }));
    setFrames([...frames, ...reversed]);
  };

  // Auto-save to IndexedDB with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (frames.length === 0) {
          await clearProject();
        } else {
          await saveProject({
            frames,
            settings,
            audioTrack,
            audioVolume
          });
        }
      } catch (err) {
        console.error('Failed to auto-save project:', err);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [frames, settings, audioTrack, audioVolume]);
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
    <div className="min-h-screen p-4 md:p-8 flex flex-col relative">
      <OnboardingTour run={runTour} onFinish={handleTourFinish} />
      
      <RenderProgressModal
        isRendering={rendering}
        progress={progress}
        ffmpegLoadProgress={loadProgress}
        isFfmpegLoaded={loaded}
        settings={settings}
      />

      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Logo size={42} className="transition-transform hover:scale-105 duration-300 cursor-pointer" />
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

      {restorableProject && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-dark-card/90 border border-cta/30 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-black/40 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl">📝</span>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white">Proyecto no guardado</h4>
                <p className="text-[10px] text-gray-400 truncate">Se detectaron {restorableProject.frames.length} fotogramas de una sesión anterior.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleDiscardSession}
                className="px-3 py-1.5 bg-dark-bg hover:bg-red-500/10 border border-dark-border hover:border-red-500/20 text-gray-400 hover:text-red-400 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Descartar
              </button>
              <button
                onClick={handleRestoreSession}
                className="px-3 py-1.5 bg-cta hover:bg-cta-hover text-white rounded-lg text-[10px] font-semibold transition-all shadow-[0_0_10px_rgba(225,29,72,0.3)] cursor-pointer"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">
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

        {/* Center: Canvas Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
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
            onReverseTimeline={handleReverseTimeline}
            onBoomerangTimeline={handleBoomerangTimeline}
            selectedFrameIndex={selectedFrameIndex}
            setSelectedFrameIndex={setSelectedFrameIndex}
            selectedFrameIds={selectedFrameIds}
            setSelectedFrameIds={setSelectedFrameIds}
            lastSelectedId={lastSelectedId}
            setLastSelectedId={setLastSelectedId}
          />
        </div>

        {/* Right Sidebar: Selected Frame Properties */}
        {frames.length > 0 && selectedFrameIds.size > 0 && (
          <div className="w-80 xl:w-96 shrink-0 bg-dark-card border border-dark-border rounded-2xl p-4 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
            {selectedFrameIds.size === 1 ? (
              (() => {
                const selectedFrame = frames.find(f => selectedFrameIds.has(f.id));
                if (!selectedFrame) return null;
                return (
                  <FrameInspector
                    frame={selectedFrame}
                    onRemove={handleRemoveFrame}
                    onDurationChange={(id, duration) => handleUpdateFrame(id, { duration })}
                    onAnimationChange={(id, animation) => handleUpdateFrame(id, { animation })}
                    onTransitionChange={(id, transition) => handleUpdateFrame(id, { transition })}
                    onTransitionDurationChange={(id, duration) => handleUpdateFrame(id, { transitionDuration: duration })}
                    onTextChange={(id, text) => handleUpdateFrame(id, { text })}
                    onStickersChange={(id, stickers) => handleUpdateFrame(id, { stickers })}
                    onCropChange={(id, crop) => handleUpdateFrame(id, { crop })}
                    onSfxChange={(id, sfx) => handleUpdateFrame(id, { sfx })}
                    onFilterChange={(id, filter) => handleUpdateFrame(id, { filter })}
                    onAdjustmentsChange={(id, adjustments) => handleUpdateFrame(id, { adjustments })}
                    onEditInCanvas={() => setSelectedFrameIndex(frames.findIndex(f => f.id === selectedFrame.id))}
                  />
                );
              })()
            ) : (
              <BatchFrameInspector
                selectedFrames={frames.filter(f => selectedFrameIds.has(f.id))}
                onRemoveSelected={handleRemoveSelectedFrames}
                onDurationChangeSelected={(duration) => handleUpdateSelectedFrames({ duration })}
                onAnimationChangeSelected={(animation) => handleUpdateSelectedFrames({ animation })}
                onTransitionChangeSelected={(transition) => handleUpdateSelectedFrames({ transition })}
                onTransitionDurationChangeSelected={(duration) => handleUpdateSelectedFrames({ transitionDuration: duration })}
                onFilterChangeSelected={(filter) => handleUpdateSelectedFrames({ filter })}
                onAdjustmentsChangeSelected={(updateFn) => handleUpdateSelectedFrames(f => ({ adjustments: updateFn(f.adjustments) }))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
