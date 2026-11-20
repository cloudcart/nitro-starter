import type {Route} from './+types/recommendations';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT} from '~/components/ReviewDisplay';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';

/** The lists the storefront's blocks ask for from the browser, and how many products each shows. */
const FIRST = {PERSONALIZED: 8, CART: 4} as const;
type Intent = keyof typeof FIRST;

/** The answer: the products, the merchant's rating settings for their cards, and whether the visitor's signals shaped it. */
export type RecommendationsAnswer = {
  products: NonNullable<Awaited<ReturnType<typeof ask>>>['productRecommendations'];
  reviewDisplay: NonNullable<Awaited<ReturnType<typeof ask>>>['productReviewSettings'] | null;
  personal: boolean;
};

const NOTHING: RecommendationsAnswer = {products: [], reviewDisplay: null, personal: false};
const PRIVATE = {'Cache-Control': 'private, no-store'};

/**
 * POST /recommendations — a personal list for a block, from what the visitor's browser keeps (T-667): `{intent, context}`
 * as JSON, the context `affinityContext()` gave — posted, so a customer's bought products never stand in an
 * address. `PERSONALIZED` (the home page; the store's best sellers when the browser knows nothing) and `CART` (the cart
 * page). Asked for from the browser only: a block as the visitor nears it, and `usePrepareRecommendations` ahead.
 */
export async function action({request, context}: Route.ActionArgs) {
  const body = (await request.json().catch(() => null)) as {intent?: unknown; context?: unknown} | null;
  const intent = typeof body?.intent === 'string' && body.intent in FIRST ? (body.intent as Intent) : null;
  if (!intent) return Response.json(NOTHING, {status: 400, headers: PRIVATE});

  const signals = contextOf(body?.context);
  const personal = Object.values(signals).some((list) => list.length > 0);
  const answer = await ask(context, intent, signals, personal).catch((error: unknown) => {
    console.error(error);
    return null;
  });

  return Response.json(
    answer ? {products: answer.productRecommendations, reviewDisplay: answer.productReviewSettings, personal} : NOTHING,
    {headers: PRIVATE},
  );
}

async function ask(
  context: Route.ActionArgs['context'],
  intent: Intent,
  signals: ReturnType<typeof contextOf>,
  personal: boolean,
) {
  const {storefront, customerAccount} = context;
  return storefront.query(RECOMMENDATIONS_QUERY, {
    variables: {intent, first: FIRST[intent], context: signals, buyer: await customerAccount.getBuyer()},
    // The same answer for every visitor whose browser knows nothing; a personal one is never kept.
    cache: personal ? storefront.CacheNone() : storefront.CacheShort(),
  });
}

/** The context as the API takes it: lists of ids, and values with a weight; anything else is left out. */
function contextOf(value: unknown) {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : []);
  const affinity = Array.isArray(given.affinity)
    ? given.affinity.flatMap((item: unknown) => {
        const {id, weight} = (item ?? {}) as {id?: unknown; weight?: unknown};
        return typeof id === 'string' && typeof weight === 'number' && Number.isFinite(weight) ? [{id, weight}] : [];
      })
    : [];
  return {
    viewedProductIds: ids(given.viewedProductIds),
    cartProductIds: ids(given.cartProductIds),
    excludedProductIds: ids(given.excludedProductIds),
    purchasedProductIds: ids(given.purchasedProductIds),
    affinity,
  };
}

const RECOMMENDATIONS_QUERY = `#graphql
  query Recommendations(
    $intent: ProductRecommendationIntent!
    $first: Int!
    $context: ProductRecommendationContextInput
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    productRecommendations(intent: $intent, first: $first, context: $context) {
      ...ProductItem
    }
    productReviewSettings {
      ...ProductReviewDisplay
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
