import type {ShouldRevalidateFunction} from 'react-router';

/**
 * The fetcher key of the adds whose refusal the cart panel says: a bundle's, which opens the panel on click, and a
 * card's quick add, which opens it on the store's answer (B-213). The panel reads the outcome under this key to say
 * why a line did not arrive (see `CartMain`).
 */
export const ADD_TO_CART_FETCHER_KEY = 'cart-add';

/**
 * `shouldRevalidate` for a page whose own data neither the cart nor the wishlist touches — a product, a listing, the
 * home page: after a form posted to the cart (`/cart`, `/cart/…`, B-239) or a heart's to the wishlist
 * (`/account/wishlist`, B-442), only the root reloads (the cart and the header's count; the wishlist every heart
 * reads), not the page's queries. Anything else, as the router decides.
 */
export const skipCartAndWishlistRevalidation: ShouldRevalidateFunction = ({formAction, defaultShouldRevalidate}) =>
  formAction && isCartOrWishlistForm(formAction) ? false : defaultShouldRevalidate;

/**
 * Whether a form goes to the cart or the wishlist: it changes the visitor's cart or hearts, which no page the same for
 * every visitor shows, and never who the visitor is — so the pages a tab kept stay (`useKeptPages` in `root.tsx`).
 */
export function isCartOrWishlistForm(formAction: string): boolean {
  return /^\/(cart(\/|\?|$)|account\/wishlist(\?|$))/.test(formAction);
}
