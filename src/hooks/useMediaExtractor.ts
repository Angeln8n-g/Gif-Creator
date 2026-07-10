import { useCallback } from 'react';

interface ExtractedFrame {
  file: File;
  previewUrl: string;
}

export function useMediaExtractor() {
  const extractVideoFrames = useCallback(async (
    videoFile: File,
    startTime: number,
    endTime: number,
    fps: number,
    onProgress?: (progress: number) => void
  ): Promise<ExtractedFrame[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoFile);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      video.onloadedmetadata = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const duration = endTime - startTime;
        const totalFrames = Math.floor(duration * fps);
        const timeInterval = 1 / fps;
        
        const extracted: ExtractedFrame[] = [];
        let currentFrame = 0;

        const captureFrame = async () => {
          if (currentFrame >= totalFrames) {
            URL.revokeObjectURL(url);
            resolve(extracted);
            return;
          }

          const currentTime = startTime + (currentFrame * timeInterval);
          video.currentTime = currentTime;
        };

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `frame_${currentFrame}.png`, { type: 'image/png' });
              extracted.push({
                file,
                previewUrl: URL.createObjectURL(blob)
              });
            }
            currentFrame++;
            if (onProgress) onProgress(currentFrame / totalFrames);
            captureFrame(); // get next frame
          }, 'image/png');
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Error playing video"));
        };

        // start capturing
        captureFrame();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Error loading video"));
      };
    });
  }, []);

  return { extractVideoFrames };
}
