import {keptSectionLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/product-extras.$handle';
import {inBackground} from '~/lib/background';
import {SHARED_PAGE} from '~/lib/page-cache';
import {loadProductExtras} from '~/lib/product-extras';

/** The same answer for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Its answer depends on its address alone: an add to the cart elsewhere on the page does not reload it. */
export function shouldRevalidate() {
  return false;
}

/**
 * A product's extras — credit plans, the store's shops — for the variant its options pick (`?Color=Red`, the product
 * page's own): what a product page opened in the browser asks as it opens (`useProductExtras`). A resource route.
 */
export async function loader(args: Route.LoaderArgs) {
  return {extras: await loadProductExtras(args, args.params.handle)};
}

/**
 * In the browser as well: a request that fails there answers no extras, and the page shows none (B-460). A step back or forward gives the answer this page already had (`keptSectionLoader`), with no request (B-556).
 */
export function clientLoader(args: Route.ClientLoaderArgs) {
  return inBackground(keptSectionLoader(args), {extras: null});
}
