import type {CSSProperties, ReactNode} from 'react';

/**
 * `highlight`: a mark on a product in the store's complementary colour — a reduced price; `plain`: on the page's
 * background — a merchant's label (in its colours), the gallery's counter; `success`:
 * a status that is done (paid, shipped); `neutral`: any other status; `accent`: a mark on the page's background that
 * must stand out — the best quantity tier (T-544); `saving`: a saving on the page's background, white on the success
 * colour — a quantity tier's (T-545).
 */
export type BadgeVariant = 'highlight' | 'plain' | 'success' | 'neutral' | 'accent' | 'saving';

const VARIANTS: Record<BadgeVariant, string> = {
  highlight: 'bg-highlight text-highlight-foreground',
  plain: 'bg-background text-foreground',
  success: 'bg-success/10 text-success',
  neutral: 'bg-surface text-foreground',
  accent: 'bg-accent text-accent-foreground',
  saving: 'bg-success text-background',
};

/** `small`: a tag on a card's edge, such as the best quantity tier's (B-365). */
const SIZES = {
  default: 'px-2.5 py-1 text-h6',
  small: 'px-2 py-0.5 text-tag',
};

/** A short label in a pill, such as "−20%" or "Sold out". The text is the caller's. */
export function Badge({
  variant,
  size = 'default',
  className = '',
  style,
  children,
}: {
  variant: BadgeVariant;
  size?: keyof typeof SIZES;
  className?: string;
  /** Colours that come from the store, such as a merchant's label; they override the variant's. */
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

/**
 * A count in a small round pill, in the foreground colour: the cart's lines, a filter's chosen values. The figure's box
 * is trimmed to its height (`text-box`), so the circle centres the figure itself, not the line around it.
 */
export function CountBadge({className = '', children}: {className?: string; children: ReactNode}) {
  return (
    <span
      className={`grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-h6 text-background ${className}`}
    >
      <span className="block leading-none [text-box:trim-both_cap_alphabetic]">{children}</span>
    </span>
  );
}
