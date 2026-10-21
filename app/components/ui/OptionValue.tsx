import {useTranslation} from '@cloudcart/nitrogen';
import {Image, KeptLink} from '@cloudcart/nitrogen-react';

/** A value's swatch, as Nitrogen's `getProductOptions` maps it: a colour, a picture, or neither. */
export type OptionSwatch = {color?: string | null; image?: {previewImage?: {url: string} | null} | null} | null;

/** A value's swatch as a round dot: its colour, or its picture at the dot's size from the image CDN (B-199). */
export function SwatchDot({swatch, px, className = ''}: {swatch?: OptionSwatch; px: number; className?: string}) {
  const image = swatch?.image?.previewImage?.url;
  return (
    <span
      className={`overflow-hidden rounded-full border border-border ${className}`}
      style={{backgroundColor: swatch?.color || undefined}}
    >
      {image && <Image src={image} alt="" width={px} aspectRatio="1/1" className="size-full object-cover" />}
    </span>
  );
}

/**
 * One value of a product option: its name on a button, or a round swatch (34 px) when the value has a colour or a
 * picture, named for screen readers. The chosen one has a foreground border; one that is sold out is struck through,
 * and its name says so to a screen reader; one that no variant has cannot be chosen. A value of another product is a
 * link to it, so search engines can follow it; a value of this product is a button, so they do not index every
 * combination.
 */
export function OptionValue({
  name,
  swatch,
  selected,
  available,
  exists,
  to,
  onSelect,
}: {
  name: string;
  swatch?: OptionSwatch;
  selected: boolean;
  available: boolean;
  exists: boolean;
  /** Another product's address with this value chosen. */
  to?: string;
  /** Chooses this value on this product. */
  onSelect?: () => void;
}) {
  const {t} = useTranslation();
  const color = swatch?.color;
  const image = swatch?.image?.previewImage?.url;
  const isSwatch = Boolean(color || image);

  // A swatch is drawn at 34 px and touched at 44 (B-401): its `after` reaches 5 px past it, over half of the 8 px gap.
  const className = isSwatch
    ? `relative grid size-8.5 place-items-center rounded-full ring-offset-2 ring-offset-background after:absolute after:-inset-1.25 ${selected ? 'ring-1 ring-accent' : 'hover:ring-1 hover:ring-border'} disabled:cursor-not-allowed disabled:opacity-40`
    : `inline-flex h-11 min-w-11 items-center justify-center rounded-button border px-4 hover:no-underline ${selected ? 'border-accent' : 'border-border hover:border-foreground'} ${available ? '' : 'text-muted line-through'} disabled:cursor-not-allowed disabled:border-dashed`;

  // The stroke or the struck-through name says it to the eye; this says it to a screen reader (B-198).
  const soldOut = !available && (
    <span className="sr-only">
      {t('format.list')}
      {t('product.soldOut')}
    </span>
  );

  const content = isSwatch ? (
    <>
      <SwatchDot swatch={swatch} px={32} className="size-full" />
      {/* A sold-out colour: a stroke across it. */}
      {!available && <span aria-hidden="true" className="absolute h-px w-full rotate-45 bg-foreground" />}
      <span className="sr-only">{name}</span>
      {soldOut}
    </>
  ) : (
    <>
      {name}
      {soldOut}
    </>
  );

  if (to) {
    return (
      <KeptLink
        to={to}
        className={className}
        title={isSwatch ? name : undefined}
        aria-current={selected ? 'true' : undefined}
        preventScrollReset
        replace
      >
        {content}
      </KeptLink>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={isSwatch ? name : undefined}
      aria-pressed={selected}
      disabled={!exists}
      onClick={() => {
        if (!selected) onSelect?.();
      }}
    >
      {content}
    </button>
  );
}
