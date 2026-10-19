import {getCartUserErrors, getCartWarnings} from '@cloudcart/nitrogen';

/**
 * What the store answered a cart change with, besides the cart: why it refused (a limit, stock, a product no
 * longer sold) and what it did not quite do as asked (an input it ignored, a code it dropped). Nothing when the
 * answer has neither. `data` is a `CartForm` fetcher's data once it is idle.
 */
export function CartActionMessages({data, className = ''}: {data: unknown; className?: string}) {
  const errors = getCartUserErrors(data);
  const warnings = getCartWarnings(data);
  if (!errors.length && !warnings.length) return null;

  return (
    <div className={`flex flex-col gap-1 text-small ${className}`}>
      {errors.map((error) => (
        <p key={`error-${error.message}`} role="alert" className="text-error">
          {error.message}
        </p>
      ))}
      {warnings.map((warning) => (
        <p key={`warning-${warning.code}-${warning.message}`} role="status" className="text-warning">
          {warning.message}
        </p>
      ))}
    </div>
  );
}
