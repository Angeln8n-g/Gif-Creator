import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelToggleButton } from './PanelToggleButton';

describe('PanelToggleButton', () => {
  it('renders a button element', () => {
    const { getByRole } = render(<PanelToggleButton isOpen={true} onClick={() => {}} />);
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('has aria-label "Ocultar ajustes" when isOpen is true', () => {
    const { getByRole } = render(<PanelToggleButton isOpen={true} onClick={() => {}} />);
    expect(getByRole('button')).toHaveAttribute('aria-label', 'Ocultar ajustes');
  });

  it('has aria-label "Mostrar ajustes" when isOpen is false', () => {
    const { getByRole } = render(<PanelToggleButton isOpen={false} onClick={() => {}} />);
    expect(getByRole('button')).toHaveAttribute('aria-label', 'Mostrar ajustes');
  });

  it('aria-label is never empty regardless of isOpen value', () => {
    const { getByRole, rerender } = render(<PanelToggleButton isOpen={true} onClick={() => {}} />);
    expect(getByRole('button').getAttribute('aria-label')).toBeTruthy();

    rerender(<PanelToggleButton isOpen={false} onClick={() => {}} />);
    expect(getByRole('button').getAttribute('aria-label')).toBeTruthy();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(<PanelToggleButton isOpen={true} onClick={handleClick} />);

    await userEvent.click(getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is keyboard accessible via Enter key', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(<PanelToggleButton isOpen={false} onClick={handleClick} />);

    const button = getByRole('button');
    button.focus();
    await userEvent.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies the className prop to the button', () => {
    const { getByRole } = render(<PanelToggleButton isOpen={true} onClick={() => {}} className="my-custom-class" />);
    expect(getByRole('button')).toHaveClass('my-custom-class');
  });

  it('renders without className prop without error', () => {
    expect(() =>
      render(<PanelToggleButton isOpen={true} onClick={() => {}} />)
    ).not.toThrow();
  });
});
