import {data} from 'react-router';
import type {Route} from './+types/cart.offer';
import {RouteErrorBoundary} from '~/components/RouteError';
import {inBackground} from '~/lib/background';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

/**
 * The store's cross-sell for the cart page (`<CartCrossSell>`), read once per visit: per buyer, as the merchant's
 * view limits count their history, so never cached. A resource route: the page loads it with
 * `useFetcher().load()`, so the cart's own changes do not read it again.
 */
export async function loader({context}: Route.LoaderArgs) {
  const offer = await context.cart.getCrossSellOffer().catch((error: unknown) => {
    console.error(error);
    return null;
  });

  return {offer};
}

/** In the browser as well: a request that fails there answers no offer, and the cart page stays (B-460). */
export function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  return inBackground(serverLoader(), {offer: null});
}

/**
 * What a buyer does with an offer (`<CartOfferDialog>`): `apply` adds an `ADD_TO_CART` offer's products, as the
 * store's own cart page does when it shows one; `viewed` and `dismissed` count the offer in the merchant's
 * statistics and keep it in the buyer's history (the offer-history cookie goes with the response).
 */
export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const offerId = String(form.get('offerId') ?? '');

  if (intent === 'apply') {
    const {cart: applied, userErrors, warnings, crossSellOffer, errors} = await cart.applyCrossSell(offerId);
    return {cart: applied, userErrors, warnings, crossSellOffer: crossSellOffer ?? null, errors};
  }

  if (intent === 'viewed' || intent === 'dismissed') {
    const count = intent === 'viewed' ? cart.offerViewed : cart.offerDismissed;
    const {counted, headers} = await count(offerId);
    return data({counted}, {headers});
  }

  throw new Response('Unknown offer intent', {status: 400});
}
