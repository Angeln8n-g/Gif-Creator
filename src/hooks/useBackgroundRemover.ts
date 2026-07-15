import { useState, useRef, useCallback } from 'react';
import { removeBackground, type Config } from '@imgly/background-removal';
import type { FrameImage } from '../types';

// Configuration options for background removal
export type BackgroundRemovalQuality = 'fast' | 'balanced' | 'high';

interface BackgroundRemovalConfig {
  quality: BackgroundRemovalQuality;
  batchSize: number; // Process multiple frames in parallel
}

// Default configurations for different quality levels
const QUALITY_CONFIGS: Record<BackgroundRemovalQuality, Partial<Config>> = {
  fast: {
    model: 'isnet_quint8', // Fastest, quantized model
    output: {
      quality: 0.8,
      format: 'image/png'
    }
  },
  balanced: {
    model: 'isnet_fp16', // Balanced quality and speed
    output: {
      quality: 0.9,
      format: 'image/png'
    }
  },
  high: {
    model: 'isnet', // Best quality, full precision
    output: {
      quality: 1.0,
      format: 'image/png'
    }
  }
};

export function useBackgroundRemover() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  
  // Cache to track model download state
  const modelLoadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Process a batch of frames in parallel
  const processBatch = async (
    frameBatch: { frame: FrameImage; index: number }[],
    config: Partial<Config>,
    onProgress: (index: number, result: { url: string; oldUrl: string; file: File }) => void
  ): Promise<void> => {
    const promises = frameBatch.map(async ({ frame, index }) => {
      try {
        const response = await fetch(frame.previewUrl);
        const blob = await response.blob();
        
        // Remove background with optimized config
        const imageBlob = await removeBackground(blob, {
          ...config,
          progress: (key, current, total) => {
            // Only track download progress on first frame of first batch
            if (!modelLoadedRef.current && key.includes('fetch') && total > 0) {
              setDownloadProgress(Math.round((current / total) * 100));
            }
          }
        });
        
        modelLoadedRef.current = true;
        setDownloadProgress(null);
        
        const url = URL.createObjectURL(imageBlob);
        const originalName = frame.file ? frame.file.name : `frame_${index}`;
        const newName = originalName.replace(/\.[^/.]+$/, "") + "_nobg.png";
        const file = new File([imageBlob], newName, { type: 'image/png' });

        onProgress(index, { url, oldUrl: frame.previewUrl, file });
        
      } catch (err) {
        console.error(`Error processing frame ${index}:`, err);
        // Return null to indicate failure, but don't stop other frames
        throw new Error(`Frame ${index + 1} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    await Promise.all(promises);
  };

  const removeBackgroundFromFrames = useCallback(async (
    frames: FrameImage[],
    onUpdateFrames: (newFrames: FrameImage[], skipHistory?: boolean) => void,
    config: BackgroundRemovalConfig = { quality: 'balanced', batchSize: 2 }
  ) => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsRemoving(true);
    setProgress(0);
    setCurrentFrame(0);
    setTotalFrames(frames.length);
    setDownloadProgress(null);
    
    const startTime = performance.now();
    
    try {
      const newFrames = [...frames];
      const qualityConfig = QUALITY_CONFIGS[config.quality];
      const batchSize = Math.max(1, Math.min(config.batchSize, 4)); // Limit to 4 concurrent processes
      
      let processedCount = 0;
      const failedFrames: number[] = [];
      
      // Process frames in batches
      for (let i = 0; i < frames.length; i += batchSize) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Operation cancelled');
        }
        
        const batch = frames
          .slice(i, Math.min(i + batchSize, frames.length))
          .map((frame, batchIndex) => ({
            frame,
            index: i + batchIndex
          }));

        try {
          await processBatch(
            batch,
            qualityConfig,
            (index, result) => {
              // Revoke old URL to free memory
              if (newFrames[index].previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(newFrames[index].previewUrl);
              }
              
              newFrames[index] = { 
                ...newFrames[index], 
                previewUrl: result.url,
                file: result.file
              };
              
              processedCount++;
              setCurrentFrame(processedCount);
              setProgress(Math.round((processedCount / frames.length) * 100));
              
              // Update UI progressively every batch
              const isFinalBatch = i + batchSize >= frames.length;
              onUpdateFrames([...newFrames], !isFinalBatch);
            }
          );
        } catch (err) {
          // Track failed frames but continue processing
          batch.forEach(({ index }) => failedFrames.push(index));
          console.error(`Batch starting at frame ${i} failed:`, err);
        }
      }
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      console.log(`✅ Background removal completed in ${duration}s`);
      console.log(`📊 Processed: ${processedCount}/${frames.length} frames`);
      console.log(`⚙️ Quality: ${config.quality}, Batch size: ${batchSize}`);
      
      if (failedFrames.length > 0) {
        console.warn(`⚠️ Failed frames: ${failedFrames.map(i => i + 1).join(', ')}`);
        alert(`Se procesaron ${processedCount} de ${frames.length} imágenes.\nFrames con error: ${failedFrames.map(i => i + 1).join(', ')}`);
      }
      
    } catch (err) {
      console.error("Error removing background", err);
      if (err instanceof Error && err.message === 'Operation cancelled') {
        alert("Operación cancelada");
      } else {
        alert("Hubo un error al remover el fondo. Por favor, intenta de nuevo.");
      }
    } finally {
      setIsRemoving(false);
      setProgress(0);
      setCurrentFrame(0);
      setTotalFrames(0);
      setDownloadProgress(null);
      abortControllerRef.current = null;
    }
  }, []);

  const cancelRemoval = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { 
    isRemoving, 
    progress, 
    downloadProgress, 
    currentFrame,
    totalFrames,
    removeBackgroundFromFrames,
    cancelRemoval
  };
}
