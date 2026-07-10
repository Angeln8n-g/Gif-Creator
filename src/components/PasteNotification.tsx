import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface PasteNotificationProps {
  count: number;             // number of frames updated
  onDismiss: () => void;
}

export function PasteNotification({ count, onDismiss }: PasteNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-dark-card border border-dark-border rounded-xl shadow-lg shadow-black/30 min-w-[220px]">
      <div className="p-1.5 rounded-lg bg-cta/20 text-cta shrink-0">
        <CheckCircle size={16} />
      </div>
      <span className="text-sm font-medium text-light flex-1">
        {count} {count === 1 ? 'fotograma actualizado' : 'fotogramas actualizados'}
      </span>
      <button
        onClick={onDismiss}
        className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-dark-bg/60 transition-colors cursor-pointer shrink-0"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  );
}
