import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/products';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {ListingHeader} from '~/components/ListingHeader';
import {ProductListing} from '~/components/ProductListing';
import {getFiltersFromParams, getSortFromParams} from '~/lib/filters';
import {LISTING_FILTER_FRAGMENT, PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT, ReviewDisplayProvider} from '~/components/ReviewDisplay';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

// Not indexed, as on the store's own pages: every product is already reached through its categories.
export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('listing.allProducts'));

export const shouldRevalidate = skipCartAndWishlistRevalidation;

/** /products — the whole catalogue, with the same filters and sorting as a category. */
export async function loader({context, request, url}: Route.LoaderArgs) {
  const {sortKey, reverse} = getSortFromParams(url.searchParams);

  const {products, productReviewSettings, errors} = await context.storefront.query(ALL_PRODUCTS_QUERY, {
    variables: {
      ...getPaginationVariables(request, {pageBy: 24}),
      filters: getFiltersFromParams(url.searchParams),
      sortKey,
      reverse,
      buyer: await context.customerAccount.getBuyer(),
    },
  });

  // The catalogue is never missing: without it the API failed or refused the request (B-413).
  if (!products) throw missingResource(errors, null);

  return {products, reviewDisplay: productReviewSettings};
}

export default function AllProducts() {
  const {t} = useTranslation();
  const {products, reviewDisplay} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={[{title: t('listing.allProducts')}]} title={t('listing.allProducts')} />
      <ReviewDisplayProvider value={reviewDisplay}>
        <ProductListing products={products} />
      </ReviewDisplayProvider>
    </div>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts(
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    products(first: $first, last: $last, before: $startCursor, after: $endCursor, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
      totalCount
      filters {
        ...ListingFilter
      }
      nodes {
        ...ProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${LISTING_FILTER_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
