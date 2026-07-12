import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioTrack: File | null;
  audioVolume: number;
  isPlaying: boolean;
  currentTime: number; // passed in seconds or normalized depending on parent
  totalDuration: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioTrack,
  audioVolume,
  currentTime,
  totalDuration
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  // Initialize wavesurfer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#475569', // slate-600
      progressColor: '#e11d48', // rose-600
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      normalize: true,
      interact: false // the playback is driven by the parent component
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, []);

  // Load audio file when it changes
  useEffect(() => {
    if (wavesurferRef.current && audioTrack) {
      const objectUrl = URL.createObjectURL(audioTrack);
      wavesurferRef.current.load(objectUrl);
      
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else if (wavesurferRef.current && !audioTrack) {
      wavesurferRef.current.empty();
    }
  }, [audioTrack]);

  // Sync volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(audioVolume);
    }
  }, [audioVolume]);

  // Sync playback time based on parent's time.
  // The canvas timeline drives the time, the waveform just visualizes the current position.
  useEffect(() => {
    if (wavesurferRef.current && totalDuration > 0) {
      const duration = wavesurferRef.current.getDuration();
      // If waveform duration is loaded and we have a valid totalDuration for the timeline
      if (duration > 0) {
        // Just scroll the waveform or update its progress to match the current time
        // This makes sure the visual progress matches the parent's video progress
        // Actually, we don't want WaveSurfer to play audio (parent handles it in PreviewPlayer), 
        // we just want it to visually represent the progress.
        const fraction = currentTime / totalDuration;
        wavesurferRef.current.seekTo(fraction);
      }
    }
  }, [currentTime, totalDuration]);

  if (!audioTrack) return null;

  return (
    <div className="w-full bg-dark-bg/50 border-t border-dark-border/40 py-1 px-4 mt-2 rounded-b-xl flex flex-col">
      <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Audio</div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
};
