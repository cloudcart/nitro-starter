/**
 * A bar fixed to the screen's bottom that keeps the page's main action in reach — the product page's add to cart, the
 * cart page's checkout. On a phone the page's white fading upward into what lies behind it, only its row taking taps;
 * from 750 px a solid bar with a top border and a shadow. With `hidden` it slides away (`reveal-up`).
 */
export const STICKY_BAR =
  'reveal reveal-up pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-background from-60% to-transparent pt-8 md:pointer-events-auto md:border-t md:border-border md:bg-background md:bg-none md:pt-0 md:shadow-overlay';

/** The bar's row: the page's width and gutters, its items side by side. */
export const STICKY_BAR_ROW =
  'pointer-events-auto mx-auto flex max-w-page items-stretch gap-3 px-gutter pb-2.5 md:items-center md:gap-4 md:px-gutter-md md:py-3';
