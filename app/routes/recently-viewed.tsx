import {keptSectionLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/recently-viewed';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {inBackground} from '~/lib/background';

/** Its answer depends on its address alone: an action elsewhere on the page (an add to the cart) does not reload it. */
export function shouldRevalidate() {
  return false;
}

/**
 * The products behind a list of ids the browser kept: `?ids=…` (most recent
 * first). Products no longer on the storefront are left out. A resource route:
 * pages call it with `useFetcher().load()`.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), {products: []});
}

/**
 * In the browser as well: a request that fails there answers the same empty answer (B-460). A step back or forward
 * gives the answer this page already had for the same list (`keptSectionLoader`), with no request; a list the visitor
 * added to since is another address, asked again (B-556).
 */
export function clientLoader(args: Route.ClientLoaderArgs) {
  return inBackground(keptSectionLoader(args), {products: []});
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 30);
  if (!ids.length) return {products: []};

  const {recentlyViewedProducts} = await context.storefront.query(RECENTLY_VIEWED_QUERY, {
    variables: {ids, first: ids.length, buyer: await context.customerAccount.getBuyer()},
    cache: context.storefront.CacheShort(),
  });

  return {products: recentlyViewedProducts};
}

const RECENTLY_VIEWED_QUERY = `#graphql
  query RecentlyViewed($ids: [ID!]!, $first: Int, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    recentlyViewedProducts(productIds: $ids, first: $first) {
      ...ProductItem
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
