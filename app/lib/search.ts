import {useRouteLoaderData} from 'react-router';
import type {PredictiveSearchQuery, ProductReviewDisplayFragment, RegularSearchQuery} from 'storefrontapi.generated';
import type {RootLoader} from '~/root';

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
      engine: 'basic',
      articles: [],
      collections: [],
      products: [],
      productsFound: null,
      vendors: [],
      pages: [],
    },
  };
}

/** How the search shows what it found: the merchant's Aura Search settings, or the standard search's look. */
export type SearchLook = {
  /** Aura Search's settings, for its reports (`useSearchReport`); null without Aura Search. */
  aura: {tracksEvents: boolean} | null;
  /** The searched words marked in the suggestions' titles and chips. */
  highlightMatches: boolean;
  /** A product suggestion's price. */
  showPrice: boolean;
  /** A product suggestion's price before the discount, beside it. */
  showCompareAtPrice: boolean;
  /** The sort on the search page. */
  showSort: boolean;
};

/**
 * How the search shows its results (T-645). A store that runs Aura Search, as its merchant set it up (the root's
 * `shop.auraSearch`, read with the shop's other settings); a store without it, the standard search as it always was:
 * no marked words, the price alone, and the sort.
 */
export function useSearchLook(): SearchLook {
  const aura = useRouteLoaderData<RootLoader>('root')?.header.shop.auraSearch ?? null;
  if (!aura) return {aura: null, highlightMatches: false, showPrice: true, showCompareAtPrice: false, showSort: true};

  return {
    aura: {tracksEvents: aura.tracksEvents},
    highlightMatches: aura.highlightMatches,
    showPrice: aura.showPrice,
    showCompareAtPrice: aura.showCompareAtPrice,
    showSort: aura.showSort,
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
