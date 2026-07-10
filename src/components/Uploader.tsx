import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import type { FrameImage } from '../types';

interface UploaderProps {
  onUpload: (frames: FrameImage[]) => void;
  onVideoSelect: (file: File) => void;
  onGifSelect: (file: File) => void;
}

export function Uploader({ onUpload, onVideoSelect, onGifSelect }: UploaderProps) {
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
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
        ${isDragActive 
          ? 'border-cta bg-cta/5 shadow-inner' 
          : 'border-dark-border bg-dark-card hover:border-cta/50 hover:bg-dark-border/50'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full transition-colors duration-300 ${isDragActive ? 'bg-cta text-light shadow-lg shadow-cta/20 scale-110' : 'bg-dark-border text-gray-400'}`}>
          <UploadCloud size={32} />
        </div>
        <div>
          <p className="text-lg font-medium text-light">
            {isDragActive ? "Suelta los archivos aquí..." : "Arrastra y suelta imágenes, GIF o video aquí"}
          </p>
          <p className="text-sm text-gray-500 mt-1">Soporta JPG, PNG, WEBP, GIF animado (Remix) y MP4</p>
        </div>
      </div>
    </div>
  );
}
