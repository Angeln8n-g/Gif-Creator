import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Camera } from 'lucide-react';
import type { FrameImage } from '../types';
import { RecorderModal } from './RecorderModal';

interface UploaderProps {
  onUpload: (frames: FrameImage[]) => void;
  onVideoSelect: (file: File) => void;
  onGifSelect: (file: File) => void;
}

export function Uploader({ onUpload, onVideoSelect, onGifSelect }: UploaderProps) {
  const [showRecorder, setShowRecorder] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if any video file was uploaded
    const videoFile = acceptedFiles.find(f => f.type.startsWith('video/'));
    if (videoFile) {
      onVideoSelect(videoFile);
      return; // Quick GIF Mode handles extraction
    }

    // Check if any GIF file was uploaded
    const gifFile = acceptedFiles.find(f => f.type === 'image/gif' || f.name.toLowerCase().endsWith('.gif'));
    if (gifFile) {
      onGifSelect(gifFile);
      return; // GIF Remix handles extraction
    }

    // Otherwise standard static image upload
    const newFrames: FrameImage[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      duration: 1.0,
      animation: 'none',
      transition: 'none',
      transitionDuration: 0.5,
      stickers: [],
    }));
    onUpload(newFrames);
  }, [onUpload, onVideoSelect, onGifSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
      'video/*': ['.mp4', '.webm', '.mov', '.mkv']
    }
  });

  return (
    <div className="tour-upload space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
          ${isDragActive 
            ? 'border-cta bg-cta/5 shadow-inner' 
            : 'border-dark-border bg-dark-card hover:border-cta/50 hover:bg-dark-border/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className={`p-3 rounded-full transition-colors duration-300 ${isDragActive ? 'bg-cta text-light shadow-lg shadow-cta/20 scale-110' : 'bg-dark-border text-gray-400'}`}>
            <UploadCloud size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-light">
              {isDragActive ? "Suelta los archivos aquí..." : "Cargar archivos"}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto leading-normal">
              Arrastra y suelta imágenes, GIF o video aquí o haz clic para buscar.
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 font-semibold uppercase tracking-wider">
              JPG, PNG, WEBP, GIF, MP4
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <button
        type="button"
        onClick={() => setShowRecorder(true)}
        className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-black/30 hover:bg-black/50 border border-dark-border hover:border-gray-500 rounded-xl text-xs font-semibold text-gray-300 transition-all cursor-pointer"
      >
        <Camera size={14} className="text-cta animate-pulse" />
        <span>Grabar Cámara o Pantalla</span>
      </button>

      {/* Recorder Modal Overlay */}
      {showRecorder && (
        <RecorderModal
          onCancel={() => setShowRecorder(false)}
          onRecordComplete={(file) => {
            onVideoSelect(file);
            setShowRecorder(false);
          }}
        />
      )}
    </div>
  );
}
