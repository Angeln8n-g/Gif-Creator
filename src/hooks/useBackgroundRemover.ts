import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import type { FrameImage } from '../types';

export function useBackgroundRemover() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);

  const removeBackgroundFromFrames = async (
    frames: FrameImage[],
    onUpdateFrames: (newFrames: FrameImage[]) => void
  ) => {
    setIsRemoving(true);
    setProgress(0);
    
    try {
      const newFrames = [...frames];
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        const response = await fetch(frame.previewUrl);
        const blob = await response.blob();
        
        // This process might take a few seconds per image depending on hardware
        const imageBlob = await removeBackground(blob);
        const url = URL.createObjectURL(imageBlob);
        
        newFrames[i] = { ...frame, previewUrl: url };
        
        setProgress(Math.round(((i + 1) / frames.length) * 100));
        
        // Update state progressively so UI reflects the progress
        onUpdateFrames([...newFrames]);
      }
    } catch (err) {
      console.error("Error removing background", err);
      alert("Hubo un error al remover el fondo. Por favor, intenta de nuevo.");
    } finally {
      setIsRemoving(false);
      setProgress(0);
    }
  };

  return { isRemoving, progress, removeBackgroundFromFrames };
}
