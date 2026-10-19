import type {Route} from './+types/tier-pieces';
import {inBackground} from '~/lib/background';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Its answer depends on its address alone: an action elsewhere on the page (an add to the cart) does not reload it. */
export function shouldRevalidate() {
  return false;
}

/** The most variants the product form offers in a piece's select, as one page of sf's `variants`. */
export const PIECE_VARIANTS = 100;

/**
 * What the product form needs to choose a variant for each piece of a quantity tier (T-545, Q-58), in one request
 * when its selects first show: `?handle=…` — the product's variants with what the selects and a cart line shown before
 * the store answers read, each with its own tiers' per-piece prices, so the cards sum a mix of variants without asking
 * again; the store's money format is the root's (B-416). A resource route: the form loads it with
 * `useFetcher().load()`; the prices are fresh as the product page's.
 */
export function loader(args: Route.LoaderArgs) {
  return inBackground(load(args), {variants: null});
}

/** In the browser as well: a request that fails there answers the same empty answer (B-460). */
export function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  return inBackground(serverLoader(), {variants: null});
}

/** The answer itself; `loader` answers its failure as the empty one. */
async function load({url, context}: Route.LoaderArgs) {
  const handle = url.searchParams.get('handle');
  if (!handle) return {variants: null};

  const {product} = await context.storefront.query(TIER_PIECES_QUERY, {
    variables: {handle, first: PIECE_VARIANTS, buyer: await context.customerAccount.getBuyer()},
  });

  return {variants: product?.variants.nodes ?? null};
}

const TIER_PIECES_QUERY = `#graphql
  query TierPieces($handle: String!, $first: Int!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      variants(first: $first) {
        nodes {
          ...TierPieceVariant
        }
      }
    }
  }
  fragment TierPieceVariant on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    minimumQuantity
    price {
      ...TierPieceMoney
    }
    compareAtPrice {
      ...TierPieceMoney
    }
    quantityDiscounts {
      minQuantity
      price {
        ...TierPieceMoney
      }
      compareAtPrice {
        ...TierPieceMoney
      }
    }
    selectedOptions {
      name
      value
    }
    image {
      url
      altText
      width
      height
    }
    mediaIds
    product {
      title
      handle
    }
  }
  fragment TierPieceMoney on MoneyV2 {
    amount
    currencyCode
    formatted
  }
` as const;
