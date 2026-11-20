import {keptSectionLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/related-products';
import {RELATED_MAX} from '~/components/ProductExtras';
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
 * A product's "You may also like" (`<RelatedProducts>`): `?handle=…`, and `&instead=1` for a sold-out product's
 * "Instead of this" (`ALTERNATIVE`). The products nearest to it by the meaning of its
 * text (`SIMILAR`, T-667), at most `RELATED_MAX`, without its linked products, which the info column's carousel shows;
 * a product without a text vector gets its category's, as `relatedProducts(linked: false)` lists them. One answer for
 * every visitor: the grid loads it with `useFetcher().load()` as the visitor nears it and shows it two rows at a time.
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
  // A sold-out product's "Instead of this" (T-679): products that can take its place.
  const intent = url.searchParams.get('instead') === '1' ? 'ALTERNATIVE' : 'SIMILAR';

  const {productRecommendations} = await context.storefront.query(RELATED_PRODUCTS_QUERY, {
    variables: {handle, intent, first: RELATED_MAX, buyer: await context.customerAccount.getBuyer()},
    cache: context.storefront.CacheShort(),
  });

  return {related: productRecommendations};
}

const RELATED_PRODUCTS_QUERY = `#graphql
  query RelatedProducts(
    $handle: String!
    $intent: ProductRecommendationIntent!
    $first: Int!
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    productRecommendations(productHandle: $handle, intent: $intent, first: $first) {
      ...ProductItem
      # Its categories: the browser orders the list by the visitor's (T-679).
      collections(first: 3) {
        nodes {
          id
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
