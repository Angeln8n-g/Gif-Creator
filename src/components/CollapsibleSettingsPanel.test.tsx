import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderSettings } from '../types';

// Mock SettingsPanel to avoid pulling in FFmpeg / heavy dependencies
vi.mock('./SettingsPanel', () => ({
  SettingsPanel: () => <div data-testid="settings-panel">SettingsPanel</div>,
}));

import { CollapsibleSettingsPanel } from './CollapsibleSettingsPanel';

const defaultSettings: RenderSettings = {
  format: 'gif',
  resolution: '720p',
  globalSpeed: 1,
  optimization: 'medium',
};

const defaultProps = {
  settings: defaultSettings,
  setSettings: vi.fn(),
  onGenerate: vi.fn(),
  isRendering: false,
  progress: 0,
  hasFrames: false,
  isFfmpegLoaded: true,
  onToggle: vi.fn(),
  onUpload: vi.fn(),
  onVideoSelect: vi.fn(),
  onGifSelect: vi.fn(),
};

describe('CollapsibleSettingsPanel', () => {
  it('renders the toggle button when open', () => {
    render(<CollapsibleSettingsPanel {...defaultProps} isOpen={true} />);
    expect(screen.getByRole('button', { name: 'Ocultar ajustes' })).toBeInTheDocument();
  });

  it('renders the toggle button when closed', () => {
    render(<CollapsibleSettingsPanel {...defaultProps} isOpen={false} />);
    expect(screen.getByRole('button', { name: 'Mostrar ajustes' })).toBeInTheDocument();
  });

  it('renders SettingsPanel when isOpen is true', () => {
    render(<CollapsibleSettingsPanel {...defaultProps} isOpen={true} />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('does not render SettingsPanel when isOpen is false', () => {
    render(<CollapsibleSettingsPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();
  });

  it('sets aria-expanded="true" on the container when open', () => {
    const { container } = render(<CollapsibleSettingsPanel {...defaultProps} isOpen={true} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveAttribute('aria-expanded', 'true');
  });

  it('sets aria-expanded="false" on the container when closed', () => {
    const { container } = render(<CollapsibleSettingsPanel {...defaultProps} isOpen={false} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onToggle when the toggle button is clicked', async () => {
    const onToggle = vi.fn();
    render(<CollapsibleSettingsPanel {...defaultProps} isOpen={true} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar ajustes' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('panel container is always present in the DOM regardless of isOpen', () => {
    const { container: c1 } = render(<CollapsibleSettingsPanel {...defaultProps} isOpen={true} />);
    expect(c1.firstChild).toBeInTheDocument();

    const { container: c2 } = render(<CollapsibleSettingsPanel {...defaultProps} isOpen={false} />);
    expect(c2.firstChild).toBeInTheDocument();
  });
});
