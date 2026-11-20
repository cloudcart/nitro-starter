import {affinityListVariablesFrom} from '@cloudcart/nitrogen';
import type {Route} from './+types/affinity-products';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT} from '~/components/ReviewDisplay';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';

/**
 * The answer: each list's products, strongest list first ("For you"; "New", the same lists newest first, only for the
 * home page), and the merchant's rating settings for their cards. A list not asked is null.
 */
export type AffinityProductsAnswer = {
  forYou: Array<ProductList | null>;
  newest: Array<ProductList | null>;
  reviewDisplay: NonNullable<Awaited<ReturnType<typeof ask>>>['productReviewSettings'] | null;
};
type ProductList = NonNullable<NonNullable<Awaited<ReturnType<typeof ask>>>['f1']>['nodes'];

const PRIVATE = {'Cache-Control': 'private, no-store'};

/**
 * POST /affinity-products — the visitor's lists, built in their browser by Affinity (`useAffinityProducts`), asked as
 * one request: `{variables, newest}`, the variables as `affinityListVariables()` makes them — posted, so the visitor's
 * interests never stand in an address. Read back with `affinityListVariablesFrom()`: only Affinity's filters, capped.
 * `newest` asks the same lists newest first too (the home page's "New"). Never cached: it is this visitor's.
 */
export async function action({request, context}: Route.ActionArgs) {
  const body = (await request.json().catch(() => null)) as {variables?: unknown; newest?: unknown} | null;
  const variables = affinityListVariablesFrom(body?.variables);
  if (!variables) return Response.json(null, {status: 400, headers: PRIVATE});

  const answer = await ask(context, variables, body?.newest === true).catch((error: unknown) => {
    console.error(error);
    return null;
  });
  if (!answer) return Response.json(null, {status: 502, headers: PRIVATE});

  const lists = (prefix: 'f' | 'n') => ([1, 2, 3, 4] as const).map((slot) => answer[`${prefix}${slot}`]?.nodes ?? null);
  const result: AffinityProductsAnswer = {
    forYou: lists('f'),
    newest: lists('n'),
    reviewDisplay: answer.productReviewSettings,
  };
  return Response.json(result, {headers: PRIVATE});
}

async function ask(
  context: Route.ActionArgs['context'],
  variables: NonNullable<ReturnType<typeof affinityListVariablesFrom>>,
  newest: boolean,
) {
  const {storefront, customerAccount} = context;
  return storefront.query(AFFINITY_PRODUCTS_QUERY, {
    variables: {
      ...variables,
      n1: newest && variables.u1,
      n2: newest && variables.u2,
      n3: newest && variables.u3,
      n4: newest && variables.u4,
      buyer: await customerAccount.getBuyer(),
    },
    cache: storefront.CacheNone(),
  });
}

// One request: up to four lists for "For you", the same up to four newest first for "New". The listing engine
// answers every first page together (one search), and the cards' data loads once for all of them.
const AFFINITY_PRODUCTS_QUERY = `#graphql
  query AffinityProducts(
    $f1: [ProductFilter!]
    $f2: [ProductFilter!]
    $f3: [ProductFilter!]
    $f4: [ProductFilter!]
    $u1: Boolean!
    $u2: Boolean!
    $u3: Boolean!
    $u4: Boolean!
    $n1: Boolean!
    $n2: Boolean!
    $n3: Boolean!
    $n4: Boolean!
    $first: Int!
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    f1: products(first: $first, filters: $f1) @include(if: $u1) {
      nodes {
        ...ProductItem
      }
    }
    f2: products(first: $first, filters: $f2) @include(if: $u2) {
      nodes {
        ...ProductItem
      }
    }
    f3: products(first: $first, filters: $f3) @include(if: $u3) {
      nodes {
        ...ProductItem
      }
    }
    f4: products(first: $first, filters: $f4) @include(if: $u4) {
      nodes {
        ...ProductItem
      }
    }
    n1: products(first: $first, filters: $f1, sortKey: CREATED_AT, reverse: true) @include(if: $n1) {
      nodes {
        ...ProductItem
      }
    }
    n2: products(first: $first, filters: $f2, sortKey: CREATED_AT, reverse: true) @include(if: $n2) {
      nodes {
        ...ProductItem
      }
    }
    n3: products(first: $first, filters: $f3, sortKey: CREATED_AT, reverse: true) @include(if: $n3) {
      nodes {
        ...ProductItem
      }
    }
    n4: products(first: $first, filters: $f4, sortKey: CREATED_AT, reverse: true) @include(if: $n4) {
      nodes {
        ...ProductItem
      }
    }
    productReviewSettings {
      ...ProductReviewDisplay
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
