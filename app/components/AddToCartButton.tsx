import {useFetcher} from 'react-router';
import {useEffect, type ReactNode} from 'react';
import {useAside} from './Aside';

export function AddToCartButton({
  merchandiseId,
  quantity = 1,
  children = 'Add to Cart',
  className,
  disabled,
}: {
  merchandiseId: string;
  quantity?: number;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const fetcher = useFetcher();
  const {open} = useAside();
  const isAdding = fetcher.state !== 'idle';

  // Open cart drawer after successful add
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      open('cart');
    }
  }, [fetcher.state, fetcher.data, open]);

  return (
    <fetcher.Form method="post" action="/cart">
      <input type="hidden" name="action" value="ADD_TO_CART" />
      <input type="hidden" name="merchandiseId" value={merchandiseId} />
      <input type="hidden" name="quantity" value={quantity} />
      <button
        type="submit"
        className={className}
        disabled={disabled || isAdding}
      >
        {isAdding ? 'Adding...' : children}
      </button>
    </fetcher.Form>
  );
}
