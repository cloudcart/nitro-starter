import {Link, useFetcher} from 'react-router';
import type {CartData} from '@cloudcart/nitrogen';
import {Money} from '@cloudcart/nitrogen-react';
import {useAside} from './Aside';
import {ArrowRightIcon} from '@heroicons/react/24/outline';

interface CartSummaryProps {
  cart: CartData;
  layout: 'aside' | 'page';
}

export function CartSummary({cart, layout}: CartSummaryProps) {
  const {close} = useAside();

  return (
    <div className={layout === 'aside'
      ? 'border-t border-gray-200 p-5 shrink-0'
      : 'py-6 flex justify-between items-center'
    }>
      {layout === 'page' && cart.discountCodes && cart.discountCodes.length > 0 && (
        <div className="flex justify-between mb-4">
          <span>Discounts</span>
          <div>
            {cart.discountCodes.map((discount: any) => (
              <span key={discount.code} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                {discount.code}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={layout === 'aside'
        ? 'flex justify-between mb-4 text-[0.95rem]'
        : 'text-lg font-bold'
      }>
        <span>Subtotal</span>
        <strong><Money data={cart.cost.totalAmount} /></strong>
      </div>

      {layout === 'aside' ? (
        <Link to="/cart" className="flex items-center justify-center gap-2 py-3 bg-dark text-light rounded-lg font-semibold text-sm no-underline hover:bg-gray-900 hover:no-underline transition-colors duration-150" onClick={close}>
          Continue to Checkout <ArrowRightIcon className="size-4" />
        </Link>
      ) : cart.checkoutUrl && cart.totalQuantity > 0 ? (
        <a href={cart.checkoutUrl} className="inline-flex py-3 px-8 bg-brand text-white no-underline rounded-lg font-semibold text-sm hover:bg-brand-dark transition-colors duration-150">
          Checkout
        </a>
      ) : (
        <button disabled className="inline-flex py-3 px-8 bg-brand/50 text-white border-none rounded-lg font-semibold text-sm cursor-not-allowed">Checkout</button>
      )}
    </div>
  );
}
