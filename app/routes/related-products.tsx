import {keptSectionLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/related-products';
import {RELATED_PAGE_MAX, RELATED_PRODUCTS_FRAGMENT} from '~/components/ProductExtras';
import {integerOf} from '~/lib/action';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {inBackground} from '~/lib/background';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Its answer depends on its address alone: an action elsewhere on the page (an add to the cart) does not reload it. */
export function shouldRevalidate() {
  return false;
}

/**
 * A page of a product's "You may also like" (`<RelatedProducts>`): `?handle=…&first=…`, then `&after=…`, the cursor the
 * page before ended at. The store's related products without the linked ones, which the info column's carousel shows
 * (`linked: false`, T-550). `first` is two rows at the grid's columns, as the browser lays them out, at most
 * `RELATED_PAGE_MAX`. A resource route: the grid loads it with `useFetcher().load()` as the visitor nears it.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), {related: null});
}

/**
 * In the browser as well: a request that fails there answers the same empty answer (B-460). A step back or forward gives the answer this page already had (`keptSectionLoader`), with no request (B-556).
 */
export function clientLoader(args: Route.ClientLoaderArgs) {
  return inBackground(keptSectionLoader(args), {related: null});
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const handle = url.searchParams.get('handle');
  if (!handle) return {related: null};
  const first = Math.min(Math.max(integerOf(url.searchParams.get('first')) ?? RELATED_PAGE_MAX, 1), RELATED_PAGE_MAX);

  const {product} = await context.storefront.query(RELATED_PRODUCTS_QUERY, {
    variables: {
      handle,
      first,
      after: url.searchParams.get('after'),
      buyer: await context.customerAccount.getBuyer(),
    },
    cache: context.storefront.CacheShort(),
  });

  return {related: product?.relatedProducts ?? null};
}

const RELATED_PRODUCTS_QUERY = `#graphql
  query RelatedProducts($handle: String!, $first: Int!, $after: String, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      relatedProducts(first: $first, after: $after, linked: false) {
        ...RelatedProductsPage
      }
    }
  }
  ${RELATED_PRODUCTS_FRAGMENT}
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
