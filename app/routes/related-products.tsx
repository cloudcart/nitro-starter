import {keptSectionLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/related-products';
import {BOUGHT_TOGETHER_MAX, RELATED_MAX} from '~/components/ProductExtras';
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
 * A product's "Bought together" and "You may also like" (`<RelatedProducts>`): `?handle=…`. "Bought together": the
 * products most often in the same order as it (`BOUGHT_TOGETHER` without a fallback, so none when it has no such
 * products; T-669), at most `BOUGHT_TOGETHER_MAX`. "You may also like": the products nearest to it by the meaning of its
 * text (`SIMILAR`, T-667), at most `RELATED_MAX`, without its linked products, which the info column's carousel shows;
 * a product without a text vector gets its category's, as `relatedProducts(linked: false)` lists them. One answer for
 * every visitor: the grid loads it with `useFetcher().load()` as the visitor nears it and shows it two rows at a time.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), NOTHING);
}

/**
 * In the browser as well: a request that fails there answers the same empty answer (B-460). A step back or forward gives the answer this page already had (`keptSectionLoader`), with no request (B-556).
 */
export function clientLoader(args: Route.ClientLoaderArgs) {
  return inBackground(keptSectionLoader(args), NOTHING);
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const handle = url.searchParams.get('handle');
  if (!handle) return NOTHING;

  const {related, together} = await context.storefront.query(RELATED_PRODUCTS_QUERY, {
    variables: {
      handle,
      first: RELATED_MAX,
      together: BOUGHT_TOGETHER_MAX,
      buyer: await context.customerAccount.getBuyer(),
    },
    cache: context.storefront.CacheShort(),
  });

  // A product "bought together" shows is not shown again under "You may also like" (T-669).
  const shown = new Set(together.map((product) => product.id));
  return {related: related.filter((product) => !shown.has(product.id)), together};
}

/** The answer when there is none to give: nothing to show in either block. */
const NOTHING = {related: null, together: null};

const RELATED_PRODUCTS_QUERY = `#graphql
  query RelatedProducts($handle: String!, $first: Int!, $together: Int!, $buyer: BuyerInput)
  @inContext(buyer: $buyer) {
    together: productRecommendations(
      productHandle: $handle
      intent: BOUGHT_TOGETHER
      first: $together
      fallback: false
    ) {
      ...ProductItem
    }
    related: productRecommendations(productHandle: $handle, intent: SIMILAR, first: $first) {
      ...ProductItem
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
