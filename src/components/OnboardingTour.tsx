import React from 'react';
import { Joyride, type Step, type EventData, STATUS } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, onFinish }) => {
  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="text-left">
          <h3 className="text-lg font-bold text-white mb-2">¡Bienvenido a GifCreatorPro! 👋</h3>
          <p className="text-gray-300 text-sm">
            Vamos a dar un rápido paseo por las funciones principales para que puedas empezar a crear GIFs increíbles.
          </p>
        </div>
      ),
      placement: 'center',
      skipBeacon: true,
    },
    {
      target: '.tour-upload',
      content: (
        <div className="text-left">
          <h3 className="text-lg font-bold text-white mb-2">Sube tus archivos</h3>
          <p className="text-gray-300 text-sm">
            Empieza subiendo un video, un GIF existente o extrayendo fotogramas. Todo aparecerá en tu lienzo.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.tour-timeline',
      content: (
        <div className="text-left">
          <h3 className="text-lg font-bold text-white mb-2">Línea de Tiempo (Timeline)</h3>
          <p className="text-gray-300 text-sm">
            Aquí abajo verás tus fotogramas. Arrástralos para reordenarlos, elimínalos o aplica efectos. También verás la pista de audio si subes una.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '.tour-settings',
      content: (
        <div className="text-left">
          <h3 className="text-lg font-bold text-white mb-2">Ajustes de Exportación</h3>
          <p className="text-gray-300 text-sm">
            En este panel puedes configurar la resolución, velocidad, añadir pistas de audio y optimizar el tamaño de tu archivo final.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '.tour-generate',
      content: (
        <div className="text-left">
          <h3 className="text-lg font-bold text-white mb-2">¡Todo listo!</h3>
          <p className="text-gray-300 text-sm">
            Cuando estés satisfecho con la vista previa, presiona aquí para renderizar y descargar tu obra maestra.
          </p>
        </div>
      ),
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideCallback}
      options={{
        zIndex: 10000,
        primaryColor: '#e11d48', // Tailwind rose-600 para que haga match con el CTA
        backgroundColor: '#1e293b', // Tailwind slate-800
        arrowColor: '#1e293b',
        textColor: '#f8fafc',
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
      }}
      styles={{
        buttonClose: {
          display: 'none',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '14px'
        },
        buttonBack: {
          color: '#cbd5e1',
        },
        tooltipContainer: {
          textAlign: 'left'
        }
      }}
    />
  );
};
