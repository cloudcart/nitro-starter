import {Link} from 'react-router';
import type {VariantOption} from '@cloudcart/nitrogen-react';

interface OptionSwatchProps {
  option: VariantOption;
  type?: string;
  color?: string | null;
  swatchUrl?: string | null;
}

export function OptionSwatch({option, type, color, swatchUrl}: OptionSwatchProps) {
  const unavailable = !option.available;

  if (type === 'color' && color) {
    return (
      <Link
        to={option.to}
        replace
        preventScrollReset
        prefetch="intent"
        className={`flex items-center justify-center size-8 border-none rounded-full p-0 no-underline outline-2 outline-offset-2 transition-[outline-color] duration-150 hover:outline-gray-300 hover:no-underline ${
          option.isActive ? 'outline-dark' : 'outline-transparent'
        }${unavailable ? ' opacity-25 pointer-events-none' : ''}`}
        title={option.value}
        aria-label={option.value}
      >
        <span
          className="size-8 rounded-full block border border-black/10"
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
        className={`inline-flex size-12 border-2 rounded-lg p-0.5 no-underline transition-[border-color] duration-150 overflow-hidden hover:border-gray-400 hover:no-underline ${
          option.isActive ? 'border-dark' : 'border-transparent'
        }${unavailable ? ' opacity-25 pointer-events-none' : ''}`}
        title={option.value}
        aria-label={option.value}
      >
        <img src={swatchUrl} alt={option.value} className="w-full h-full object-cover rounded-md" />
      </Link>
    );
  }

  // Default: text pill
  return (
    <Link
      to={option.to}
      replace
      preventScrollReset
      prefetch="intent"
      className={`inline-flex items-center justify-center py-2 px-[1.125rem] border-[1.5px] rounded-lg text-[0.85rem] font-medium no-underline transition-[border-color,background,color] duration-150 min-w-12 hover:border-dark hover:no-underline ${
        option.isActive
          ? 'border-dark bg-dark text-light'
          : 'border-gray-200 bg-light text-dark'
      }${unavailable ? ' opacity-35 line-through pointer-events-none' : ''}`}
    >
      {option.value}
    </Link>
  );
}
