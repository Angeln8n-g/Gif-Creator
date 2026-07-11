import { useState, useRef, useEffect } from 'react';
import { X, Camera, Monitor, Circle, Square } from 'lucide-react';

interface RecorderModalProps {
  onCancel: () => void;
  onRecordComplete: (file: File) => void;
}

export function RecorderModal({ onCancel, onRecordComplete }: RecorderModalProps) {
  const [mode, setMode] = useState<'camera' | 'screen' | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordTime, setRecordTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Stop all active streams
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stream]);

  // Handle timer count during active recording
  useEffect(() => {
    if (status === 'recording') {
      setRecordTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status]);

  // Start selected stream
  const startStream = async (selectedMode: 'camera' | 'screen') => {
    stopStream();
    try {
      let activeStream: MediaStream;
      if (selectedMode === 'camera') {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: false, // Extracting frames, no audio needed
        });
      } else {
        activeStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false,
        });
      }
      setStream(activeStream);
      setMode(selectedMode);
      setStatus('idle');

      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
      }
    } catch (err) {
      console.error('Error starting media capture:', err);
      alert('No se pudo acceder al dispositivo de captura o se canceló el permiso.');
      setMode(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    
    // Choose mimeType (safely fallback across browsers)
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4' };
    }

    try {
      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = chunksRef.current[0]?.type || 'video/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `recording.${ext}`, { type: mimeType });
        onRecordComplete(file);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice size in ms
      setStatus('recording');
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      alert('Error al iniciar el grabador de video.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('idle');
      stopStream();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h3 className="text-base font-bold text-light flex items-center space-x-2">
            <Camera size={18} className="text-cta" />
            <span>Grabador de Medios</span>
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-500 hover:text-light hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[300px]">
          {!mode ? (
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <button
                onClick={() => startStream('camera')}
                className="flex flex-col items-center justify-center p-8 bg-dark-bg/60 border border-dark-border hover:border-cta/40 hover:bg-cta/5 rounded-2xl transition-all group cursor-pointer"
              >
                <Camera size={40} className="text-gray-400 group-hover:text-cta mb-3 transition-colors" />
                <span className="text-sm font-semibold text-gray-200">Grabar Cámara</span>
                <span className="text-[10px] text-gray-600 mt-1">Usa tu webcam directamente</span>
              </button>

              <button
                onClick={() => startStream('screen')}
                className="flex flex-col items-center justify-center p-8 bg-dark-bg/60 border border-dark-border hover:border-cta/40 hover:bg-cta/5 rounded-2xl transition-all group cursor-pointer"
              >
                <Monitor size={40} className="text-gray-400 group-hover:text-cta mb-3 transition-colors" />
                <span className="text-sm font-semibold text-gray-200">Grabar Pantalla</span>
                <span className="text-[10px] text-gray-600 mt-1">Captura tu escritorio o pestañas</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* Video container */}
              <div className="relative w-full aspect-video bg-black border border-dark-border rounded-xl overflow-hidden shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Recording badge */}
                {status === 'recording' && (
                  <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2.5 py-1 rounded-md flex items-center space-x-1.5 font-bold animate-pulse">
                    <Circle size={10} fill="white" />
                    <span>REC {formatTime(recordTime)}</span>
                  </div>
                )}
              </div>

              {/* Controls bar */}
              <div className="flex items-center space-x-4">
                {status === 'idle' ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-red-600/20 transition-all cursor-pointer"
                  >
                    <Circle size={14} fill="white" />
                    <span>Iniciar Grabación</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-white text-dark-bg hover:bg-gray-100 font-semibold rounded-lg shadow-lg transition-all cursor-pointer"
                  >
                    <Square size={14} fill="currentColor" />
                    <span>Detener y Cortar</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    stopStream();
                    setMode(null);
                  }}
                  className="px-4 py-2.5 bg-dark-bg border border-dark-border text-gray-400 hover:text-light rounded-lg transition-colors cursor-pointer"
                >
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
