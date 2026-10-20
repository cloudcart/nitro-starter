import {useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/search';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {ProductListing} from '~/components/ProductListing';
import {SearchForm} from '~/components/SearchForm';
import {getFiltersFromParams, getSortFromParams} from '~/lib/filters';
import {LISTING_FILTER_FRAGMENT, PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {
  getEmptyPredictiveSearchResult,
  type PredictiveSearchReturn,
  type RegularSearchReturn,
  SEARCH_PARAM,
} from '~/lib/search';
import {Input} from '~/components/ui/Field';
import {Button, ButtonLink} from '~/components/ui/Button';
import {ListingHeader} from '~/components/ListingHeader';
import {OTHER_RESULTS, SearchOtherResults} from '~/components/SearchOtherResults';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT, ReviewDisplayProvider} from '~/components/ReviewDisplay';
import {integerOf} from '~/lib/action';
import {EmptyState} from '~/components/ui/EmptyState';
import {SearchIcon} from '~/components/ui/icons';
import {SEARCH_PRODUCT_FRAGMENT} from '~/components/SearchProductCard';
import {listedProducts} from '~/lib/analytics';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {inBackground} from '~/lib/background';

export const meta: Route.MetaFunction = ({data, matches}) => {
  const term = data && 'term' in data ? data.term : '';
  const t = metaTranslator(matches);
  return privateMeta(term ? t('search.metaTitle', {term}) : t('search.title'));
};

export const shouldRevalidate = skipCartAndWishlistRevalidation;

/**
 * /search?query=… — the CloudCart storefront's own search address. The same
 * loader answers the predictive search as the visitor types (`predictive`).
 */
export async function loader({request, url, context}: Route.LoaderArgs) {
  const isPredictive = url.searchParams.has('predictive');

  return isPredictive ? predictiveSearch({url, context}) : regularSearch({request, url, context});
}

/**
 * The predictive search loads in the background: a request that fails in the browser answers as a failed search, and
 * the page the visitor types on stays (B-460). The search page itself loads as any page.
 */
export function clientLoader({serverLoader, request}: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  if (!url.searchParams.has('predictive')) return serverLoader();
  const term = String(url.searchParams.get(SEARCH_PARAM) || '').trim();
  return inBackground(serverLoader(), {
    type: 'predictive' as const,
    term,
    error: true,
    result: getEmptyPredictiveSearchResult(),
  });
}

export default function SearchPage() {
  const {t} = useTranslation();
  const data = useLoaderData<typeof loader>();
  if (data.type === 'predictive') return null;
  const {term, result, error, reviewDisplay} = data;
  const products = result.items.products;

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={[{title: t('search.title')}]} title={t('search.title')} />
      <SearchForm className="flex max-w-column gap-2">
        {({inputRef}) => (
          <>
            <Input
              defaultValue={term}
              name={SEARCH_PARAM}
              placeholder={t('search.placeholder')}
              aria-label={t('search.label')}
              ref={inputRef}
              type="search"
              className="min-w-0 flex-1"
            />
            <Button type="submit">{t('search.submit')}</Button>
          </>
        )}
      </SearchForm>
      {error && <p className="mt-4 text-error">{t('search.error')}</p>}
      {/* A failed search is not an empty one: only the error shows (B-425). */}
      {!term || error ? null : !result.total ? (
        // Nothing found: a hint, and the categories as the way on (B-403).
        <EmptyState
          icon={SearchIcon}
          title={t('search.empty', {term})}
          text={t('search.emptyHint')}
          action={
            <ButtonLink to="/categories" prefetch="intent" variant="secondary">
              {t('actions.browseCategories')}
            </ButtonLink>
          }
          className="mt-10"
        />
      ) : (
        <div className="mt-10 flex flex-col gap-12">
          <SearchOtherResults
            pages={result.items.pages.nodes.flatMap((node) => (node.__typename === 'Page' ? [node] : []))}
            articles={result.items.articles.nodes.flatMap((node) => (node.__typename === 'Article' ? [node] : []))}
          />
          <ReviewDisplayProvider value={reviewDisplay}>
            <ProductListing products={{...products, filters: products.productFilters}} defaultSort="relevance" />
          </ReviewDisplayProvider>
        </div>
      )}
      {/* /search with no term is not a search, nor is one that failed: its page view is reported as OTHER (B-314). */}
      {term && !error ? (
        <Analytics.SearchView
          data={{searchTerm: term, searchResults: result, products: listedProducts(products?.nodes ?? [])}}
        />
      ) : null}
    </div>
  );
}

/**
 * The full search: products with facets, sorting and pages, and on top the
 * pages and articles that match. Out-of-stock products come last.
 */
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $term: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $buyer: BuyerInput
    $otherResults: Int!
  ) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    products: search(
      query: $term
      types: [PRODUCT]
      first: $first
      last: $last
      after: $endCursor
      before: $startCursor
      productFilters: $filters
      sortKey: $sortKey
      reverse: $reverse
    ) {
      totalCount
      productFilters {
        ...ListingFilter
      }
      nodes {
        ... on Product {
          ...ProductItem
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
    pages: search(query: $term, types: [PAGE], first: $otherResults) {
      nodes {
        __typename
        ... on Page {
          title
          handle
        }
      }
    }
    articles: search(query: $term, types: [ARTICLE], first: $otherResults) {
      nodes {
        __typename
        ... on Article {
          title
          handle
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${LISTING_FILTER_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;

async function regularSearch({
  request,
  url,
  context,
}: Pick<Route.LoaderArgs, 'request' | 'url' | 'context'>): Promise<RegularSearchReturn> {
  const {storefront, customerAccount} = context;
  const term = String(url.searchParams.get(SEARCH_PARAM) || '').trim();
  const empty = {
    products: {
      totalCount: 0,
      productFilters: [],
      nodes: [],
      pageInfo: {hasPreviousPage: false, hasNextPage: false, startCursor: null, endCursor: null},
    },
    pages: {nodes: []},
    articles: {nodes: []},
  };

  if (!term) return {type: 'regular', term, reviewDisplay: null, result: {total: 0, items: empty}};

  const {sortKey, reverse} = getSortFromParams(url.searchParams);
  const {errors, productReviewSettings, ...items} = await storefront.query(SEARCH_QUERY, {
    variables: {
      ...getPaginationVariables(request, {pageBy: 24}),
      term,
      filters: getFiltersFromParams(url.searchParams),
      sortKey: sortKey ?? 'RELEVANCE',
      reverse,
      buyer: await customerAccount.getBuyer(),
      otherResults: OTHER_RESULTS,
    },
  });

  // The API's messages are a developer's: logged on the server; the visitor is told in the store's words (B-201).
  if (errors) console.error(errors.map(({message}) => message).join(', '));
  const error = Boolean(errors);
  // No data at all when the API refused the request: the empty result, with the error (B-413).
  const found = items.products ? items : empty;
  const total = found.products.totalCount + found.pages.nodes.length + found.articles.nodes.length;

  return {type: 'regular', term, error, reviewDisplay: productReviewSettings, result: {total, items: found}};
}

/** What the search panel shows as the visitor types: the products as cards, the rest as links (B-441). */
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch($term: String!, $limit: Int!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    predictiveSearch(query: $term, limit: $limit, limitScope: EACH) {
      products {
        ...SearchProduct
        # The search page's own cards: "View all" opens the page on these products at once (T-574).
        ...ProductItem
      }
      productsFound
      collections {
        id
        title
        onlineStoreUrl
      }
      vendors {
        id
        title
        handle
      }
      pages {
        id
        title
        handle
      }
      articles {
        id
        title
        handle
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;

async function predictiveSearch({
  url,
  context,
}: Pick<Route.LoaderArgs, 'url' | 'context'>): Promise<PredictiveSearchReturn> {
  const {storefront, customerAccount} = context;
  const term = String(url.searchParams.get(SEARCH_PARAM) || '').trim();
  const limit = Math.min(Math.max(integerOf(url.searchParams.get('limit')) ?? 10, 1), 12);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // The panel says the search failed rather than the page turning into an error while the visitor types — a refusal
  // and a failed call alike, as the panel loads in the background (B-423); the API's messages are logged on the server
  // (B-202).
  const answer = await storefront
    .query(PREDICTIVE_SEARCH_QUERY, {variables: {limit, term, buyer: await customerAccount.getBuyer()}})
    .catch((error: Error) => ({predictiveSearch: null, errors: [error]}));
  const {predictiveSearch: items, errors} = answer;
  const reviewDisplay = 'productReviewSettings' in answer ? answer.productReviewSettings : null;
  if (errors || !items) {
    console.error(errors?.map(({message}) => message).join(', ') ?? 'predictiveSearch: no result');
    return {type, term, error: true, result: getEmptyPredictiveSearchResult()};
  }

  const {products, collections, vendors, pages, articles} = items;
  const total = [products, collections, vendors, pages, articles].reduce((count, list) => count + list.length, 0);

  return {type, term, reviewDisplay, result: {items, total}};
}
