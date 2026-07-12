import React from 'react';
import { Loader2, DownloadCloud, Wand2, Package, Sparkles } from 'lucide-react';
import type { RenderSettings } from '../types';

interface RenderProgressModalProps {
  isRendering: boolean;
  progress: number;
  ffmpegLoadProgress?: number;
  isFfmpegLoaded: boolean;
  settings: RenderSettings;
}

export const RenderProgressModal: React.FC<RenderProgressModalProps> = ({
  isRendering,
  progress,
  ffmpegLoadProgress,
  isFfmpegLoaded,
  settings,
}) => {
  if (!isRendering) return null;

  // Determine stage based on progress and load status
  let stageTitle = '';
  let stageSubtitle = '';
  let StageIcon = Loader2;

  if (!isFfmpegLoaded) {
    stageTitle = 'Preparando Entorno';
    stageSubtitle = 'Descargando motor de procesamiento de alta calidad...';
    StageIcon = DownloadCloud;
  } else if (progress < 20) {
    stageTitle = 'Analizando Fotogramas';
    stageSubtitle = 'Aplicando filtros, efectos y ajustes...';
    StageIcon = Wand2;
  } else if (progress < 90) {
    stageTitle = `Generando ${settings.format.toUpperCase()}`;
    stageSubtitle = `Optimizando a ${settings.resolution}...`;
    StageIcon = Loader2;
  } else {
    stageTitle = 'Empaquetando';
    stageSubtitle = '¡Casi listo para descargar!';
    StageIcon = Package;
  }

  // Use ffmpegLoadProgress if not loaded, else render progress
  const displayProgress = !isFfmpegLoaded ? (ffmpegLoadProgress || 0) : progress;
  
  // Create SVG dash array for circular progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-black relative overflow-hidden flex flex-col items-center text-center">
        {/* Glow effect */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-cta/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
        
        {/* Circular Progress */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-dark-bg"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-cta transition-all duration-300 ease-out shadow-[0_0_15px_rgba(225,29,72,0.5)]"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <StageIcon className={`text-cta mb-1 ${StageIcon === Loader2 ? 'animate-spin' : 'animate-pulse'}`} size={28} />
            <span className="text-2xl font-bold text-white font-mono">{Math.round(displayProgress)}%</span>
          </div>
        </div>

        {/* Status Text */}
        <div className="space-y-2 z-10 relative">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            {progress >= 90 && <Sparkles className="text-amber-400" size={20} />}
            {stageTitle}
          </h2>
          <p className="text-sm text-gray-400 max-w-[250px] mx-auto leading-relaxed">
            {stageSubtitle}
          </p>
        </div>

        {/* Decorative dots */}
        <div className="flex gap-1.5 mt-8 justify-center">
          <div className={`w-1.5 h-1.5 rounded-full ${displayProgress > 0 ? 'bg-cta' : 'bg-dark-border'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${displayProgress > 33 ? 'bg-cta' : 'bg-dark-border'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${displayProgress > 66 ? 'bg-cta' : 'bg-dark-border'}`} />
        </div>
      </div>
    </div>
  );
};
