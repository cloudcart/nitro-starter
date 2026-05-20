import type {CartData} from '@cloudcart/nitrogen';
import {CartLineItem} from './CartLineItem';
import {useAside} from './Aside';
import {ShoppingBagIcon} from '@heroicons/react/24/outline';

interface CartMainProps {
  cart: CartData | null;
  layout: 'aside' | 'page';
}

export function CartMain({cart, layout}: CartMainProps) {
  const {close} = useAside();
  const lineLayout = layout === 'aside' ? 'drawer' : 'page';

  if (!cart || cart.totalQuantity === 0) {
    return (
      <div className={layout === 'aside'
        ? 'flex flex-col items-center justify-center py-12 px-5 text-center text-gray-500'
        : 'text-center py-16 text-gray-500'
      }>
        <ShoppingBagIcon className="size-12 text-gray-300 mx-auto mb-4" />
        <p className="mb-4">Your cart is empty</p>
        {layout === 'aside' ? (
          <button onClick={close} className="mt-2 bg-transparent border border-gray-200 py-2 px-6 rounded-lg text-[0.85rem] cursor-pointer font-sans hover:border-dark transition-[border-color] duration-150">Continue Shopping</button>
        ) : (
          <a href="/products" className="text-brand font-semibold">Continue Shopping</a>
        )}
      </div>
    );
  }

  return (
    <ul className={layout === 'aside'
      ? 'list-none flex-1 overflow-y-auto px-5'
      : 'list-none'
    }>
      {cart.lines.nodes.map((line) => (
        <CartLineItem key={line.id} line={line} layout={lineLayout} />
      ))}
    </ul>
  );
}
