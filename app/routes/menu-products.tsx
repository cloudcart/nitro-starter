import type {Route} from './+types/menu-products';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT} from '~/components/ReviewDisplay';
import {inBackground} from '~/lib/background';
import {MENU_PRODUCTS} from '~/components/MegaMenu';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** A category's or a smart collection's global id, as a menu item's `resourceId` carries it. */
const COLLECTION_ID = /^gid:\/\/cloudcart\/Collection\/(sc_)?\d+$/;

/** Its answer depends on its address alone: an action elsewhere on the page (an add to the cart) does not reload it. */
export function shouldRevalidate() {
  return false;
}

/**
 * The products a mega-menu panel shows (`<MegaMenu>`): the first products of the collection its item links to
 * (`?collection=<resourceId>`), or the store's featured products when the item links to no collection or the
 * collection has none. A resource route: the panel loads it with `useFetcher().load()` when it first opens.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), {products: [], reviewDisplay: null});
}

/** In the browser as well: a request that fails there answers the same empty answer (B-460). */
export function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  return inBackground(serverLoader(), {products: [], reviewDisplay: null});
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;
  const buyer = await customerAccount.getBuyer();
  const collectionId = url.searchParams.get('collection') ?? '';

  if (COLLECTION_ID.test(collectionId)) {
    const {collection, productReviewSettings} = await storefront.query(MENU_COLLECTION_PRODUCTS_QUERY, {
      variables: {id: collectionId, first: MENU_PRODUCTS, buyer},
      cache: storefront.CacheShort(),
    });
    if (collection?.products.nodes.length) {
      return {products: collection.products.nodes, reviewDisplay: productReviewSettings};
    }
  }

  const {products, productReviewSettings} = await storefront.query(MENU_FEATURED_PRODUCTS_QUERY, {
    variables: {first: MENU_PRODUCTS, buyer},
    cache: storefront.CacheShort(),
  });

  // The merchant's rating settings, for the cards (`ReviewDisplayProvider`).
  return {products: products.nodes, reviewDisplay: productReviewSettings};
}

const MENU_COLLECTION_PRODUCTS_QUERY = `#graphql
  query MenuCollectionProducts($id: ID!, $first: Int!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    collection(id: $id) {
      products(first: $first) {
        nodes {
          ...ProductItem
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;

const MENU_FEATURED_PRODUCTS_QUERY = `#graphql
  query MenuFeaturedProducts($first: Int!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    products(first: $first, filters: [{isFeatured: true}]) {
      nodes {
        ...ProductItem
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
