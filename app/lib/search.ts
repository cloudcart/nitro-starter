import type {PredictiveSearchQuery, ProductReviewDisplayFragment, RegularSearchQuery} from 'storefrontapi.generated';

type ResultWithItems<Type extends 'predictive' | 'regular', Items> = {
  type: Type;
  term: string;
  /** Whether the API answered with errors; their messages are logged on the server, never shown (B-201). */
  error?: boolean;
  result: {total: number; items: Items};
};

export type RegularSearchReturn = ResultWithItems<'regular', Omit<RegularSearchQuery, 'productReviewSettings'>> & {
  /** The merchant's rating settings, for the cards (`ReviewDisplayProvider`). */
  reviewDisplay: ProductReviewDisplayFragment | null;
};
export type PredictiveSearchReturn = ResultWithItems<
  'predictive',
  NonNullable<PredictiveSearchQuery['predictiveSearch']>
>;

/** The search page's address and the parameter holding the term — the CloudCart storefront's own (`/search?query=`). */
export const SEARCH_ENDPOINT = '/search';
export const SEARCH_PARAM = 'query';

/** A predictive search with no results, to reset the search state. */
export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn['result'] {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      productsFound: null,
      vendors: [],
      pages: [],
    },
  };
}

/** The search page's URL for a term. */
export function searchUrl(term: string) {
  return `${SEARCH_ENDPOINT}?${new URLSearchParams({[SEARCH_PARAM]: term})}`;
}
