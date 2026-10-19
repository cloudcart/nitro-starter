import type {Route} from './+types/search-start';
import {SEARCH_PRODUCT_FRAGMENT} from '~/components/SearchProductCard';
import {inBackground} from '~/lib/background';

/** How many products each list of the empty search shows: one row. */
const SEARCH_START_PRODUCTS = 4;

/** Its answer depends on its address alone: an action elsewhere on the page (an add to the cart) does not reload it. */
export function shouldRevalidate() {
  return false;
}

/**
 * What the search shows before the visitor types (`<PredictiveSearch>`): the products they viewed lately
 * (`?ids=…`, most recent first, as their browser keeps them) and the store's best sellers, in one call. A resource
 * route: the search loads it with `useFetcher().load()` when it opens.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), {recent: [], bestSellers: []});
}

/** In the browser as well: a request that fails there answers the same empty answer (B-460). */
export function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  return inBackground(serverLoader(), {recent: [], bestSellers: []});
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, SEARCH_START_PRODUCTS);

  const {recentlyViewedProducts, products} = await storefront.query(SEARCH_START_QUERY, {
    variables: {ids, withRecent: ids.length > 0, first: SEARCH_START_PRODUCTS, buyer: await customerAccount.getBuyer()},
    cache: storefront.CacheShort(),
  });

  return {recent: recentlyViewedProducts ?? [], bestSellers: products.nodes};
}

const SEARCH_START_QUERY = `#graphql
  query SearchStart($ids: [ID!]!, $withRecent: Boolean!, $first: Int!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    recentlyViewedProducts(productIds: $ids, first: $first) @include(if: $withRecent) {
      ...SearchProduct
    }
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...SearchProduct
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
` as const;
