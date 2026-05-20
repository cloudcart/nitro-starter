import {Await} from 'react-router';
import {Suspense} from 'react';
import type {CartData} from '@cloudcart/nitrogen';
import {CartMain} from './CartMain';
import {CartSummary} from './CartSummary';

export function CartDrawer({cart}: {cart: Promise<CartData | null>}) {
  return (
    <Suspense fallback={<p className="p-5">Loading cart...</p>}>
      <Await resolve={cart}>
        {(resolvedCart) => <CartDrawerInner cart={resolvedCart} />}
      </Await>
    </Suspense>
  );
}

function CartDrawerInner({cart}: {cart: CartData | null}) {
  if (!cart || cart.totalQuantity === 0) {
    return <CartMain cart={null} layout="aside" />;
  }

  return (
    <div className="flex flex-col h-full">
      <CartMain cart={cart} layout="aside" />
      <CartSummary cart={cart} layout="aside" />
    </div>
  );
}
