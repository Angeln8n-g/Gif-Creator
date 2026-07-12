import { useCallback } from 'react';
import type { FrameImage } from '../types';
import { generateId } from '../utils/generateId';

export function useGifExtractor() {
  const extractGifFrames = useCallback(async (
    gifFile: File,
    onProgress?: (progress: number) => void
  ): Promise<FrameImage[]> => {
    // Check if ImageDecoder is available (Chrome 94+, Edge, Opera, etc)
    if (!('ImageDecoder' in window)) {
      throw new Error('Tu navegador no soporta la decodificación nativa de GIFs. Por favor, utiliza Chrome o Edge.');
    }

    try {
      // @ts-ignore - ImageDecoder is not in standard lib.dom.d.ts yet
      const decoder = new window.ImageDecoder({ type: 'image/gif', data: gifFile.stream() });
      const frames: FrameImage[] = [];
      
      // Wait for tracks to be ready
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      if (!track) {
        throw new Error('No se pudo encontrar una pista de imagen en el GIF.');
      }

      // We don't always know total frameCount immediately, so we loop until decoding fails or frameCount is reached
      let frameIndex = 0;
      
      while (true) {
        try {
          // Decode frame
          const result = await decoder.decode({ frameIndex });
          const imageBitmap = result.image;
          
          // Create canvas to convert bitmap to blob
          const canvas = document.createElement('canvas');
          canvas.width = imageBitmap.displayWidth;
          canvas.height = imageBitmap.displayHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("No canvas context");

          ctx.drawImage(imageBitmap, 0, 0);
          
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const frameFile = new File([blob], `frame_${frameIndex}.png`, { type: 'image/png' });
            frames.push({
              id: generateId(),
              file: frameFile,
              previewUrl: URL.createObjectURL(blob),
              // duration is in microseconds, convert to seconds
              duration: (imageBitmap.duration || 100000) / 1000000, 
              animation: 'none',
              transition: 'none',
              transitionDuration: 0.5,
              stickers: [],
            });
          }
          
          imageBitmap.close();
          frameIndex++;
          
          if (onProgress && track.frameCount > 0) {
            onProgress(frameIndex / track.frameCount);
          }

          // If frameCount is known, break when reached
          if (track.frameCount > 0 && frameIndex >= track.frameCount) {
            break;
          }
        } catch (e) {
          // RangeError usually means we've reached the end of the frames if frameCount was unknown
          if (e instanceof RangeError) {
            break;
          }
          throw e;
        }
      }

      return frames;
    } catch (error) {
      console.error("Error decoding GIF:", error);
      throw error;
    }
  }, []);

  return { extractGifFrames };
}
