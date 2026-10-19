import {getSubscribeForms} from '@cloudcart/nitrogen';
import type {Route} from '../+types/root';
import {FOOTER_SUBSCRIBE_FORM_ID} from '~/lib/footer';

/**
 * What an anonymous visitor's page holds of their own: their cart, whether they are signed in, and the subscribe
 * forms that ask them (chosen for the visitor in the request's analytics cookie). The root streams it into a page
 * rendered for the visitor; a page cached for every visitor (`isSharedPage`) gets it from `/visitor` in the browser.
 * A signed-in customer's own data — the wishlist, the policy consent request — is not here: their pages are never
 * cached (`server.ts`). None of it may throw — the page must render without it.
 */
export function loadVisitorData({context, request}: Pick<Route.LoaderArgs, 'context' | 'request'>) {
  const {customerAccount, cart, storefront} = context;

  // The cart is read on every request and never cached: a failed call shows no cart, not a failed page (B-385).
  const cartData = cart.get().catch((error: unknown) => {
    console.error(error);
    return null;
  });

  // The store's pop-up subscribe forms (`<SubscribePopups>`) and the footer's embedded one (`<SubscribeForm>`), for
  // the visitor in the request's analytics cookie, in one call.
  const subscribeForms = getSubscribeForms({
    storefront,
    customerAccount,
    request,
    embeddedFormId: FOOTER_SUBSCRIBE_FORM_ID,
  }).catch((error: unknown) => {
    console.error(error);
    return [];
  });

  return {cart: cartData, isLoggedIn: customerAccount.isLoggedIn(), subscribeForms};
}

/** A page cached for every visitor: no visitor, so nothing of theirs is asked for — the browser asks (`/visitor`). */
export function noVisitorData(): ReturnType<typeof loadVisitorData> {
  return {cart: Promise.resolve(null), isLoggedIn: Promise.resolve(false), subscribeForms: Promise.resolve([])};
}
