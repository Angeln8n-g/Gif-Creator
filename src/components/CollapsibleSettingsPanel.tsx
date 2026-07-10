import { useEffect, useState } from 'react';
import type { RenderSettings, FrameImage } from '../types';
import { SettingsPanel } from './SettingsPanel';
import { PanelToggleButton } from './PanelToggleButton';

interface CollapsibleSettingsPanelProps {
  settings: RenderSettings;
  setSettings: React.Dispatch<React.SetStateAction<RenderSettings>>;
  onGenerate: () => void;
  isRendering: boolean;
  progress: number;
  hasFrames: boolean;
  isFfmpegLoaded: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpload: (frames: FrameImage[]) => void;
  onVideoSelect: (file: File) => void;
  onGifSelect: (file: File) => void;
}

/**
 * Wraps `SettingsPanel` with animated collapse/expand behaviour.
 *
 * - When `isOpen === true`: renders the full SettingsPanel with the toggle
 *   button pinned to its right edge.
 * - When `isOpen === false`: renders only a narrow ~40px rail containing the
 *   toggle button so the user can re-open the panel at any time.
 * - Width + opacity transition: 300ms ease-in-out (disabled when the user
 *   has `prefers-reduced-motion: reduce` set in their OS).
 * - `aria-expanded` is set on the outer container for screen-reader support.
 */
export function CollapsibleSettingsPanel({
  settings,
  setSettings,
  onGenerate,
  isRendering,
  progress,
  hasFrames,
  isFfmpegLoaded,
  isOpen,
  onToggle,
  onUpload,
  onVideoSelect,
  onGifSelect,
}: CollapsibleSettingsPanelProps) {
  // Detect prefers-reduced-motion so we can disable CSS transitions.
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Transition classes — omitted when the user prefers reduced motion.
  const transitionClass = reducedMotion ? '' : 'transition-[width,opacity] duration-300 ease-in-out';

  return (
    <div
      aria-expanded={isOpen}
      className={[
        'relative flex flex-shrink-0 overflow-hidden',
        transitionClass,
        isOpen ? 'w-80 xl:w-96 opacity-100' : 'w-10 opacity-100',
      ].join(' ')}
    >
      {/* Full settings panel — visible only when open */}
      {isOpen && (
        <div className="flex-1 min-w-0">
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            onGenerate={onGenerate}
            isRendering={isRendering}
            progress={progress}
            hasFrames={hasFrames}
            isFfmpegLoaded={isFfmpegLoaded}
            onUpload={onUpload}
            onVideoSelect={onVideoSelect}
            onGifSelect={onGifSelect}
          />
        </div>
      )}

      {/* Toggle button — always visible, pinned to the right edge */}
      <div
        className={[
          'flex items-center justify-center flex-shrink-0',
          isOpen ? 'absolute right-0 top-1/2 -translate-y-1/2 z-10' : 'w-10',
        ].join(' ')}
      >
        <PanelToggleButton
          isOpen={isOpen}
          onClick={onToggle}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors duration-200 cursor-pointer"
        />
      </div>
    </div>
  );
}
