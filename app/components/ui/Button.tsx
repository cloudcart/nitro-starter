import type {ComponentProps} from 'react';
import type {LinkProps} from 'react-router';
import {KeptLink} from '@cloudcart/nitrogen-react';

/**
 * `primary`: the one main action of a view, filled; `secondary`: every other action, outlined; `inverse`: the main
 * action on a dark image (the hero), filled with the background colour.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'inverse';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent/85',
  secondary: 'border border-foreground bg-transparent text-foreground hover:bg-surface',
  // On the dark surface it sits on, the focus ring is in the background colour (B-194).
  inverse: 'bg-background text-foreground hover:bg-background/85 focus-visible:outline-background',
};

/**
 * The classes of a button, for a component that renders its own element and takes a class (nitrogen-react's
 * `AddToCartButton`, a form's submit). `Button` and `ButtonLink` use the same.
 */
export function buttonClass(variant: ButtonVariant = 'primary', {fullWidth = false} = {}) {
  return `${BUTTON_BASE} ${fullWidth ? 'w-full' : ''} ${BUTTON_VARIANTS[variant]}`;
}

/** What every button shares — its size, shape, type, disabled and busy states; `BUTTON_VARIANTS` add the colours. */
export const BUTTON_BASE =
  'busy inline-flex h-11 items-center justify-center gap-2 rounded-button px-6 text-body font-medium whitespace-nowrap transition-colors hover:no-underline disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

type ButtonOwnProps = {variant?: ButtonVariant; fullWidth?: boolean};

/**
 * A button. `type` is `button` unless given: a form is submitted only by a button that says so. While `loading` it is
 * busy (`aria-busy`): a turning ring before its label (the `busy` utility), and no second press; it keeps its focus.
 */
export function Button({
  variant,
  fullWidth,
  loading = false,
  className = '',
  type = 'button',
  onClick,
  children,
  ...props
}: ButtonOwnProps & {loading?: boolean} & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      className={`${buttonClass(variant, {fullWidth})} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * A link that looks like a button: for an action that goes to another page ("Shop all", "View cart"). A kept page
 * (`KEPT_PAGES`) it opens from data loaded on the visitor's intent when `prefetch` asks for it; none by default.
 */
export function ButtonLink({
  variant,
  fullWidth,
  className = '',
  prefetch = 'none',
  ...props
}: ButtonOwnProps & LinkProps) {
  return <KeptLink className={`${buttonClass(variant, {fullWidth})} ${className}`} prefetch={prefetch} {...props} />;
}
