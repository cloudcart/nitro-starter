import {Link} from 'react-router';
import type {VariantOption} from '@cloudcart/nitro-react';

interface OptionSwatchProps {
  option: VariantOption;
  /** The option type from the API: color, image, select, radio, 2d, numeric_alpha */
  type?: string;
  /** Hex color for color-type options */
  color?: string | null;
  /** Swatch image URL for image-type options */
  swatchUrl?: string | null;
}

/**
 * Renders a single option value based on its type.
 * - color → colored circle
 * - image → swatch thumbnail
 * - default → text pill
 */
export function OptionSwatch({option, type, color, swatchUrl}: OptionSwatchProps) {
  const baseClass = `option-value${option.isActive ? ' selected' : ''}${!option.available ? ' unavailable' : ''}`;

  if (type === 'color' && color) {
    return (
      <Link
        to={option.to}
        replace
        preventScrollReset
        prefetch="intent"
        className={`option-swatch-color ${baseClass}`}
        title={option.value}
        aria-label={option.value}
      >
        <span
          className="swatch-circle"
          style={{backgroundColor: color}}
        />
      </Link>
    );
  }

  if (type === 'image' && swatchUrl) {
    return (
      <Link
        to={option.to}
        replace
        preventScrollReset
        prefetch="intent"
        className={`option-swatch-image ${baseClass}`}
        title={option.value}
        aria-label={option.value}
      >
        <img src={swatchUrl} alt={option.value} className="swatch-img" />
      </Link>
    );
  }

  // Default: text pill (for select, radio, numeric_alpha, 2d, or no type)
  return (
    <Link
      to={option.to}
      replace
      preventScrollReset
      prefetch="intent"
      className={baseClass}
    >
      {option.value}
    </Link>
  );
}
