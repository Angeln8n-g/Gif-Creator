import type { EffectCategory, EffectClipboard, EffectMask, FrameImage } from '../types';

/**
 * Returns true when the given effect category is actively set on the frame.
 *
 * - animation : frame.animation !== 'none'
 * - transition: frame.transition !== 'none'
 * - text      : frame.text?.content is truthy
 * - stickers  : frame.stickers.length > 0
 * - crop      : frame.crop exists and crop.shape !== 'none'
 */
export function hasEffect(frame: FrameImage | undefined | null, cat: EffectCategory): boolean {
  if (!frame) return false;
  switch (cat) {
    case 'animation':
      return frame.animation !== 'none';
    case 'transition':
      return frame.transition !== 'none';
    case 'text':
      return !!(frame.text?.content);
    case 'stickers':
      return frame.stickers.length > 0;
    case 'crop':
      return !!(frame.crop && frame.crop.shape !== 'none');
    case 'filter':
      return !!(frame.filter && frame.filter !== 'none');
  }
}

/**
 * Returns a new FrameImage that is a copy of `target` with only the properties
 * whose category is present in `mask` overwritten from `source`.
 *
 * Arrays and objects are shallow-copied to avoid shared references between
 * the returned frame and the clipboard snapshot.
 */
export function applyEffectMask(
  target: FrameImage,
  source: EffectClipboard['sourceEffects'],
  mask: EffectMask,
): FrameImage {
  const updated: FrameImage = { ...target };

  if (mask.has('animation')) {
    updated.animation = source.animation;
  }

  if (mask.has('transition')) {
    updated.transition = source.transition;
    updated.transitionDuration = source.transitionDuration;
  }

  if (mask.has('text')) {
    updated.text = source.text;
  }

  if (mask.has('stickers')) {
    updated.stickers = [...source.stickers];
  }

  if (mask.has('crop')) {
    updated.crop = source.crop ? { ...source.crop } : undefined;
  }

  if (mask.has('filter')) {
    updated.filter = source.filter;
  }

  return updated;
}
