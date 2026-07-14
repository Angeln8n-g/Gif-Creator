import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Type, 
  Image as ImageIcon, 
  Brush, 
  Square, 
  Smile 
} from 'lucide-react';
import type { CanvasLayer } from '../types';

interface LayerPanelProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDeleteLayer: (id: string) => void;
}

export function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onOpacityChange,
  onMoveLayer,
  onDeleteLayer
}: LayerPanelProps) {
  
  const getLayerIcon = (type: CanvasLayer['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={14} className="text-blue-400" />;
      case 'text':
        return <Type size={14} className="text-yellow-400" />;
      case 'sticker':
        return <Smile size={14} className="text-green-400" />;
      case 'drawing':
        return <Brush size={14} className="text-purple-400" />;
      case 'shape':
        return <Square size={14} className="text-red-400" />;
      default:
        return <Brush size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="w-64 bg-dark-card border border-dark-border rounded-2xl flex flex-col h-full overflow-hidden shadow-xl shadow-black/30">
      {/* Header */}
      <div className="p-4 border-b border-dark-border bg-dark-card/30 flex justify-between items-center">
        <h4 className="text-sm font-bold text-white tracking-tight uppercase">Capas ({layers.length})</h4>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[300px]">
        {layers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500 text-xs">
            <span className="text-2xl mb-1">🥞</span>
            <span>No hay capas aún.<br />Dibuja o añade texto.</span>
          </div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = selectedLayerId === layer.id;
            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col space-y-2 ${
                  isSelected
                    ? 'bg-cta/10 border-cta/40 shadow-sm shadow-cta/5'
                    : 'bg-dark-bg/40 border-dark-border/40 hover:bg-dark-bg/80 hover:border-dark-border'
                }`}
              >
                {/* Layer Main Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="shrink-0">{getLayerIcon(layer.type)}</span>
                    <span className="text-xs font-semibold text-gray-200 truncate select-none">
                      {layer.name}
                    </span>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Visibility */}
                    <button
                      onClick={() => onToggleVisibility(layer.id)}
                      className={`p-1 rounded-md transition-colors ${
                        layer.visible 
                          ? 'text-gray-400 hover:text-white' 
                          : 'text-red-400/80 hover:text-red-400'
                      }`}
                      title={layer.visible ? 'Ocultar Capa' : 'Mostrar Capa'}
                    >
                      {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>

                    {/* Toggle Lock */}
                    <button
                      onClick={() => onToggleLock(layer.id)}
                      className={`p-1 rounded-md transition-colors ${
                        layer.locked 
                          ? 'text-yellow-500 hover:text-yellow-400' 
                          : 'text-gray-500 hover:text-white'
                      }`}
                      title={layer.locked ? 'Desbloquear Capa' : 'Bloquear Capa'}
                    >
                      {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>

                    {/* Delete Layer (Only if it's not the background image) */}
                    {layer.type !== 'image' && (
                      <button
                        onClick={() => onDeleteLayer(layer.id)}
                        className="p-1 rounded-md text-gray-500 hover:text-red-400 transition-colors"
                        title="Eliminar Capa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Layer Adjustments (Opacity & Reordering, shown when selected) */}
                {isSelected && (
                  <div 
                    className="flex items-center justify-between pt-1 border-t border-dark-border/40 gap-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Opacity slider */}
                    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                      <span className="text-[10px] text-gray-500 font-semibold uppercase shrink-0">Opac.</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-cta shrink-1"
                      />
                    </div>

                    {/* Layer Reorder */}
                    <div className="flex items-center space-x-0.5 shrink-0">
                      <button
                        onClick={() => onMoveLayer(layer.id, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded-md text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition-colors cursor-pointer"
                        title="Traer al frente"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => onMoveLayer(layer.id, 'down')}
                        disabled={index === layers.length - 1}
                        className="p-1 rounded-md text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition-colors cursor-pointer"
                        title="Enviar al fondo"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
