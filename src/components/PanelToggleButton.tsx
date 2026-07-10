import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PanelToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Toggle button for the collapsible settings panel.
 *
 * - Renders ChevronLeft when the panel is open, ChevronRight when closed
 * - Provides a smooth icon transition (300ms)
 * - Dynamic aria-label for accessibility: "Ocultar ajustes" / "Mostrar ajustes"
 * - Native <button> element for full keyboard accessibility (Tab + Enter/Space)
 */
export function PanelToggleButton({ isOpen, onClick, className }: PanelToggleButtonProps) {
  const ariaLabel = isOpen ? 'Ocultar ajustes' : 'Mostrar ajustes';
  const Icon = isOpen ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
    >
      <Icon className="transition-transform duration-300" />
    </button>
  );
}
