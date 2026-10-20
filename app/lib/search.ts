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
> & {
  /** The merchant's rating settings, for the products as the search page's cards (`rememberedSearch`). */
  reviewDisplay?: ProductReviewDisplayFragment | null;
};

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

/** The search panel's last answer that found something, in the tab's memory. */
let remembered: PredictiveSearchReturn | null = null;

/** Keeps the answer the search panel shows: the search page for its term opens on it (`rememberedSearch`). */
export function rememberSearch(answer: PredictiveSearchReturn) {
  if (!answer.error && answer.result.items.products.length) remembered = answer;
}

/**
 * What the search panel found for the search page at `search` — its products in the order it showed them, its pages
 * and articles — while the page loads; none for another term, or for the term with a filter or an order of its own, whose
 * first products are others.
 */
export function rememberedSearch(search: string): PredictiveSearchReturn | null {
  const params = new URLSearchParams(search);
  const term = params.get(SEARCH_PARAM)?.trim();
  return remembered && term === remembered.term && [...params.keys()].every((key) => key === SEARCH_PARAM)
    ? remembered
    : null;
}
