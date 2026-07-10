import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import type { FrameImage } from '../types';

export function useBackgroundRemover() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const removeBackgroundFromFrames = async (
    frames: FrameImage[],
    onUpdateFrames: (newFrames: FrameImage[], skipHistory?: boolean) => void
  ) => {
    setIsRemoving(true);
    setProgress(0);
    setDownloadProgress(null);
    
    try {
      const newFrames = [...frames];
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        const response = await fetch(frame.previewUrl);
        const blob = await response.blob();
        
        // This process might take a few seconds per image depending on hardware
        // We pass the progress callback to capture the model download phase
        const imageBlob = await removeBackground(blob, {
          progress: (key, current, total) => {
            if (key.includes('fetch') && total > 0) {
              setDownloadProgress(Math.round((current / total) * 100));
            } else {
              setDownloadProgress(null);
            }
          }
        });
        const url = URL.createObjectURL(imageBlob);
        
        newFrames[i] = { ...frame, previewUrl: url };
        
        setProgress(Math.round(((i + 1) / frames.length) * 100));
        
        // Update state progressively so UI reflects the progress
        // Skip history updates until the final frame is processed
        const isFinalFrame = i === frames.length - 1;
        onUpdateFrames([...newFrames], !isFinalFrame);
      }
    } catch (err) {
      console.error("Error removing background", err);
      alert("Hubo un error al remover el fondo. Por favor, intenta de nuevo.");
    } finally {
      setIsRemoving(false);
      setProgress(0);
      setDownloadProgress(null);
    }
  };

  return { isRemoving, progress, downloadProgress, removeBackgroundFromFrames };
}
