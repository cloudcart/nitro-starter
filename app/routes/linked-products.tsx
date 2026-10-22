import {keptSectionLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/linked-products';
import {LINKED_PAGE_SIZE, LINKED_PRODUCTS_FRAGMENT} from '~/components/LinkedProducts';
import {inBackground} from '~/lib/background';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Its answer depends on its address alone: an action elsewhere on the page (an add to the cart) does not reload it. */
export function shouldRevalidate() {
  return false;
}

/**
 * A page of the products the merchant linked to a product (`<LinkedProducts>`, T-550): `?handle=…`, then `&after=…`,
 * the cursor the page before ended at. A resource route: the carousel loads it with `useFetcher().load()` as the visitor
 * nears it, and the next page as they reach its last product.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), {linked: null});
}

/**
 * In the browser as well: a request that fails there answers the same empty answer (B-460). A step back or forward gives the answer this page already had (`keptSectionLoader`), with no request (B-556).
 */
export function clientLoader(args: Route.ClientLoaderArgs) {
  return inBackground(keptSectionLoader(args), {linked: null});
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const handle = url.searchParams.get('handle');
  if (!handle) return {linked: null};

  const {product} = await context.storefront.query(LINKED_PRODUCTS_QUERY, {
    variables: {
      handle,
      first: LINKED_PAGE_SIZE,
      after: url.searchParams.get('after'),
      buyer: await context.customerAccount.getBuyer(),
    },
    cache: context.storefront.CacheShort(),
  });

  return {linked: product?.linkedProducts ?? null};
}

const LINKED_PRODUCTS_QUERY = `#graphql
  query LinkedProducts($handle: String!, $first: Int!, $after: String, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      linkedProducts(first: $first, after: $after, unavailableProducts: HIDE) {
        ...LinkedProductsPage
      }
    }
  }
  ${LINKED_PRODUCTS_FRAGMENT}
` as const;
