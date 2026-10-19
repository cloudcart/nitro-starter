import {redirect} from 'react-router';
import {localRedirectPath} from '@cloudcart/nitrogen';
import type {Route} from './+types/cart.$segment';

/**
 * /cart/discount:{code} — a discount link, at the address the platform gives
 * them. As there, the code goes on the cart, and the visitor goes on to the
 * checkout when the cart has products, or to the home page while it is empty.
 * A `?redirect=` path on this storefront is followed instead.
 */
export async function loader({url, context, params}: Route.LoaderArgs) {
  const code = /^discount:(.+)$/.exec(params.segment)?.[1]?.trim();
  if (!code) throw new Response('Not found', {status: 404});

  const {cart} = context;
  const result = await cart.updateDiscountCodes([code]);
  const headers = result.cart?.id ? cart.setCartId(result.cart.id) : new Headers();

  const to =
    localRedirectPath(url.searchParams.get('redirect')) ?? (result.cart?.totalQuantity ? result.cart.checkoutUrl : '/');
  return redirect(to, {headers});
}
