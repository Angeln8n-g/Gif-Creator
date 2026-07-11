import { useState } from 'react';
import type { RenderSettings, Resolution, OptimizationLevel, FrameImage } from '../types';
import { Settings, Download, Video, Image as ImageIcon, Loader2, Gauge, Zap, Music, Trash2, Copyright } from 'lucide-react';
import { Uploader } from './Uploader';

interface SettingsPanelProps {
  settings: RenderSettings;
  setSettings: React.Dispatch<React.SetStateAction<RenderSettings>>;
  onGenerate: () => void;
  isRendering: boolean;
  progress: number;
  hasFrames: boolean;
  isFfmpegLoaded: boolean;
  ffmpegLoadProgress?: number;
  onUpload: (frames: FrameImage[]) => void;
  onVideoSelect: (file: File) => void;
  onGifSelect: (file: File) => void;
  audioTrack: File | null;
  setAudioTrack: React.Dispatch<React.SetStateAction<File | null>>;
  audioVolume: number;
  setAudioVolume: React.Dispatch<React.SetStateAction<number>>;
  frames: FrameImage[];
}

const speedPresets = [
  { value: 0.25, label: '0.25×' },
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
  { value: 4, label: '4×' },
];

const optimizationLevels: { value: OptimizationLevel; label: string; desc: string }[] = [
  { value: 'none', label: 'Sin opt.', desc: 'Máxima calidad' },
  { value: 'low', label: 'Baja', desc: 'Poca compresión' },
  { value: 'medium', label: 'Media', desc: 'Equilibrado' },
  { value: 'high', label: 'Alta', desc: 'Mínimo peso' },
];

export function SettingsPanel({
  settings,
  setSettings,
  onGenerate,
  isRendering,
  progress,
  hasFrames,
  isFfmpegLoaded,
  ffmpegLoadProgress,
  onUpload,
  onVideoSelect,
  onGifSelect,
  audioTrack,
  setAudioTrack,
  audioVolume,
  setAudioVolume,
  frames,
}: SettingsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getEstimatedSize = () => {
    if (frames.length === 0) return 0;
    
    let width = 1280;
    let height = 720;
    
    if (settings.resolution === '480p') {
      width = 854;
      height = 480;
    } else if (settings.resolution === '720p') {
      width = 1280;
      height = 720;
    } else if (settings.resolution === '1080p') {
      width = 1920;
      height = 1080;
    } else if (settings.resolution === 'custom') {
      width = settings.customWidth || 1080;
      height = settings.customHeight || 1080;
    }

    const totalFrames = frames.length;
    
    if (settings.format === 'gif') {
      const colors = settings.gifColors !== undefined ? settings.gifColors : (
        settings.optimization === 'high' ? 64 :
        settings.optimization === 'medium' ? 128 : 256
      );
      const dither = settings.gifDither !== undefined ? settings.gifDither : (
        settings.optimization === 'high' ? 'bayer' : 'floyd_steinberg'
      );
      
      let compressionFactor = 0.35;
      if (settings.optimization === 'none') compressionFactor = 0.5;
      else if (settings.optimization === 'high' || dither === 'bayer') compressionFactor = 0.18;
      else if (settings.optimization === 'medium') compressionFactor = 0.28;
      
      const bitsPerPixel = Math.log2(colors);
      const bytesPerFrame = (width * height * bitsPerPixel) / 8;
      
      const estBytes = bytesPerFrame * totalFrames * compressionFactor;
      return estBytes / (1024 * 1024);
    } else if (settings.format === 'webp') {
      const qv = settings.webpQuality !== undefined ? settings.webpQuality : (
        settings.optimization === 'high' ? 50 : settings.optimization === 'medium' ? 75 : 90
      );
      
      const compressionFactor = 0.05 * (qv / 100);
      const bytesPerFrame = width * height * 3;
      const estBytes = bytesPerFrame * totalFrames * compressionFactor;
      return estBytes / (1024 * 1024);
    } else {
      const crf = settings.mp4Quality !== undefined ? settings.mp4Quality : (
        settings.optimization === 'high' ? 32 :
        settings.optimization === 'medium' ? 26 :
        settings.optimization === 'low' ? 21 : 18
      );
      
      let bitrateKbps = 1500;
      if (crf <= 20) bitrateKbps = 3000;
      else if (crf <= 26) bitrateKbps = 1500;
      else if (crf <= 32) bitrateKbps = 750;
      else bitrateKbps = 400;
      
      const pixelsScale = (width * height) / (1280 * 720);
      const finalBitrate = bitrateKbps * pixelsScale;
      
      const totalDuration = frames.reduce((acc, f) => acc + (f.duration / settings.globalSpeed), 0);
      const estBytes = totalDuration * (finalBitrate * 1000 / 8);
      const audioOverhead = audioTrack ? audioTrack.size * 0.9 : 0;
      
      return (estBytes + audioOverhead) / (1024 * 1024);
    }
  };
  
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col h-full shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="text-cta" />
        <h2 className="text-xl font-semibold text-white tracking-tight">Ajustes</h2>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1">
        {/* File Uploader */}
        <Uploader
          onUpload={onUpload}
          onVideoSelect={onVideoSelect}
          onGifSelect={onGifSelect}
        />
        {/* Output Format */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Formato de Exportación</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSettings(s => ({ ...s, format: 'gif' }))}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300 cursor-pointer ${
                settings.format === 'gif'
                  ? 'bg-cta/20 border-cta text-cta shadow-[0_0_15px_rgba(225,29,72,0.2)]'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              <ImageIcon size={18} className="mb-1" />
              <span className="text-xs font-medium">GIF</span>
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, format: 'mp4' }))}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300 cursor-pointer ${
                settings.format === 'mp4'
                  ? 'bg-cta/20 border-cta text-cta shadow-[0_0_15px_rgba(225,29,72,0.2)]'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              <Video size={18} className="mb-1" />
              <span className="text-xs font-medium">MP4</span>
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, format: 'webp' }))}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300 cursor-pointer ${
                settings.format === 'webp'
                  ? 'bg-cta/20 border-cta text-cta shadow-[0_0_15px_rgba(225,29,72,0.2)]'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              <ImageIcon size={18} className="mb-1" />
              <span className="text-xs font-medium">WebP</span>
            </button>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Resolución</label>
          <div className="relative">
            <select
              value={settings.resolution}
              onChange={(e) => setSettings(s => ({ ...s, resolution: e.target.value as Resolution }))}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-cta focus:border-cta transition-all appearance-none cursor-pointer"
            >
              <option value="480p">480p (Rápido, Menos peso)</option>
              <option value="720p">720p (Balanceado)</option>
              <option value="1080p">1080p (Alta Calidad)</option>
              <option value="custom">Personalizado</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Custom Resolution Sliders */}
        {settings.resolution === 'custom' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300 bg-dark-bg p-4 rounded-xl border border-dark-border">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Ancho</label>
                <span className="text-xs font-mono text-cta bg-cta/10 px-2 py-0.5 rounded-md">{settings.customWidth || 1080}px</span>
              </div>
              <input
                type="range"
                min="240"
                max="3840"
                step="2"
                value={settings.customWidth || 1080}
                onChange={(e) => setSettings(s => ({ ...s, customWidth: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cta hover:accent-cta-hover transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Alto</label>
                <span className="text-xs font-mono text-cta bg-cta/10 px-2 py-0.5 rounded-md">{settings.customHeight || 1080}px</span>
              </div>
              <input
                type="range"
                min="240"
                max="2160"
                step="2"
                value={settings.customHeight || 1080}
                onChange={(e) => setSettings(s => ({ ...s, customHeight: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cta hover:accent-cta-hover transition-all"
              />
            </div>
          </div>
        )}

        {/* Global Speed */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={16} className="text-gray-300" />
            <label className="text-sm font-medium text-gray-300">Velocidad Global</label>
            <span className="ml-auto text-xs font-mono text-cta bg-cta/10 px-2 py-0.5 rounded-md">{settings.globalSpeed}×</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {speedPresets.map(preset => (
              <button
                key={preset.value}
                onClick={() => setSettings(s => ({ ...s, globalSpeed: preset.value }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.globalSpeed === preset.value
                    ? 'bg-cta/20 text-cta border border-cta/40 shadow-[0_0_10px_rgba(225,29,72,0.15)]'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-gray-300 hover:border-gray-500'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optimization (GIF only) */}
        {settings.format === 'gif' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-gray-300" />
              <label className="text-sm font-medium text-gray-300">Optimización</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {optimizationLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setSettings(s => ({ ...s, optimization: level.value }))}
                  className={`flex flex-col items-center py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                    settings.optimization === level.value
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                      : 'bg-dark-bg border-dark-border text-gray-400 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="text-xs font-medium">{level.label}</span>
                  <span className="text-[10px] opacity-60 mt-0.5">{level.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio upload and settings (MP4 only) */}
        {settings.format === 'mp4' && (
          <div className="pt-4 border-t border-dark-border/40 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Music size={16} className="text-gray-300" />
              <label className="text-sm font-medium text-gray-300">Pista de Audio / Música</label>
            </div>
            
            {audioTrack ? (
              <div className="bg-dark-bg/80 border border-dark-border rounded-xl p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-200 truncate" title={audioTrack.name}>
                      {audioTrack.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {(audioTrack.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setAudioTrack(null)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar audio"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Volumen</span>
                    <span className="font-mono text-cta">{Math.round(audioVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cta"
                  />
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border border-dashed border-dark-border hover:border-gray-500 bg-dark-bg/30 hover:bg-dark-bg/50 rounded-xl p-4 transition-colors cursor-pointer text-center">
                <Music size={20} className="text-gray-500 mb-1.5" />
                <span className="text-[11px] text-gray-400 font-medium">Subir archivo de audio</span>
                <span className="text-[9px] text-gray-600 mt-0.5">MP3, WAV, M4A, AAC</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioTrack(file);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Marca de agua (Watermark) */}
        <div className="pt-4 border-t border-dark-border/40 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Copyright size={16} className="text-gray-300" />
            <label className="text-sm font-medium text-gray-300">Marca de Agua Global</label>
          </div>
          <div className="space-y-3 bg-dark-bg/40 border border-dark-border/60 rounded-xl p-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] text-gray-400">Texto de la marca</label>
              <input
                type="text"
                placeholder="Ej. @mi_usuario, Reservados todos los derechos"
                value={settings.watermarkText || ''}
                onChange={(e) => setSettings(s => ({ ...s, watermarkText: e.target.value || undefined }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-light placeholder-gray-600 focus:outline-none focus:border-cta"
              />
            </div>
            
            {settings.watermarkText && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Opacidad</span>
                    <span className="font-mono text-cta">{Math.round((settings.watermarkOpacity ?? 0.4) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.watermarkOpacity ?? 0.4}
                    onChange={(e) => setSettings(s => ({ ...s, watermarkOpacity: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cta"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-400">Posición en pantalla</label>
                  <select
                    value={settings.watermarkPosition || 'bottom-right'}
                    onChange={(e) => setSettings(s => ({ ...s, watermarkPosition: e.target.value as any }))}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-xs text-light focus:outline-none focus:border-cta cursor-pointer"
                  >
                    <option value="bottom-right">Abajo a la derecha</option>
                    <option value="bottom-left">Abajo a la izquierda</option>
                    <option value="top-right">Arriba a la derecha</option>
                    <option value="top-left">Arriba a la izquierda</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Real-time File Size Estimator */}
        {frames.length > 0 && (
          <div className="bg-dark-bg/60 border border-dark-border/40 rounded-xl p-4 space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Tamaño estimado de archivo</span>
              <span className="text-sm font-bold text-cta font-mono">
                ~{getEstimatedSize().toFixed(1)} MB
              </span>
            </div>
            {getEstimatedSize() > 10 && settings.format === 'gif' && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] leading-relaxed">
                ⚠️ El tamaño estimado es alto. Considera reducir la resolución, bajar la cantidad de colores o cambiar a formato WebP/MP4.
              </div>
            )}
          </div>
        )}

        {/* Advanced settings toggle */}
        <div className="pt-4 border-t border-dark-border/40 mt-4">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={(e) => {
                setShowAdvanced(e.target.checked);
                if (!e.target.checked) {
                  setSettings(s => ({
                    ...s,
                    gifColors: undefined,
                    gifDither: undefined,
                    webpQuality: undefined,
                    mp4Quality: undefined
                  }));
                }
              }}
              className="w-4 h-4 rounded border-dark-border bg-dark-bg text-cta focus:ring-cta accent-cta"
            />
            <span className="text-sm font-medium text-gray-300">Ajustes Avanzados de Compresión</span>
          </label>
        </div>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-dark-bg/50 border border-dark-border rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            {settings.format === 'gif' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-gray-400 font-medium">Máximo de Colores</label>
                  <select
                    value={settings.gifColors !== undefined ? settings.gifColors : 256}
                    onChange={(e) => setSettings(s => ({ ...s, gifColors: parseInt(e.target.value) }))}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-xs text-light focus:outline-none focus:border-cta cursor-pointer"
                  >
                    <option value="16">16 colores (Súper ligero, retro)</option>
                    <option value="32">32 colores</option>
                    <option value="64">64 colores (Optimizado)</option>
                    <option value="128">128 colores (Equilibrado)</option>
                    <option value="256">256 colores (Máxima fidelidad)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] text-gray-400 font-medium">Método de Dither (Difuminado)</label>
                  <select
                    value={settings.gifDither !== undefined ? settings.gifDither : 'floyd_steinberg'}
                    onChange={(e) => setSettings(s => ({ ...s, gifDither: e.target.value as any }))}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-xs text-light focus:outline-none focus:border-cta cursor-pointer"
                  >
                    <option value="floyd_steinberg">Floyd-Steinberg (Suave)</option>
                    <option value="bayer">Bayer (Patrón de rejilla retro)</option>
                    <option value="none">Ninguno (Colores planos, ligero)</option>
                  </select>
                </div>
              </>
            )}

            {settings.format === 'webp' && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Calidad de Compresión</span>
                  <span className="font-mono text-cta">{settings.webpQuality !== undefined ? settings.webpQuality : 75}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.webpQuality !== undefined ? settings.webpQuality : 75}
                  onChange={(e) => setSettings(s => ({ ...s, webpQuality: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cta"
                />
              </div>
            )}

            {settings.format === 'mp4' && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Calidad de Video (CRF)</span>
                  <span className="font-mono text-cta">CRF {settings.mp4Quality !== undefined ? settings.mp4Quality : 26}</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="38"
                  step="1"
                  value={settings.mp4Quality !== undefined ? settings.mp4Quality : 26}
                  onChange={(e) => setSettings(s => ({ ...s, mp4Quality: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cta"
                />
                <div className="flex justify-between text-[8px] text-gray-600">
                  <span>CRF 18 (Mayor calidad)</span>
                  <span>CRF 38 (Menor peso)</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-dark-border">
        {isRendering ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Procesando medios...</span>
              <span className="text-cta font-mono font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border/50">
              <div 
                className="bg-cta h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(225,29,72,0.5)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <button
            onClick={onGenerate}
            disabled={!hasFrames || !isFfmpegLoaded}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer
              ${hasFrames && isFfmpegLoaded
                ? 'bg-cta hover:bg-cta-hover text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] hover:-translate-y-0.5 border border-white/10' 
                : 'bg-dark-bg border border-dark-border text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {!isFfmpegLoaded ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Cargando motor FFmpeg {ffmpegLoadProgress ? `(${ffmpegLoadProgress}%)` : ''}...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Exportar {settings.format.toUpperCase()}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
