import {getPaginationVariables} from '@cloudcart/nitrogen';
import type {Route as CategoryRoute} from '../routes/+types/category.$handle';
import {getFiltersFromParams, getSortFromParams} from '~/lib/filters';
import {LISTING_FILTER_FRAGMENT, PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT} from '~/components/ReviewDisplay';
import {missingResource} from '~/lib/missing';

/**
 * A category (/category/{handle}) or a smart collection (/selection/{handle}):
 * the same data, at the address of its kind. The API is asked for that kind
 * only, so a handle that a category and a smart collection share reaches each
 * at its own address, and a handle of the other kind alone is a 404.
 */
export async function loadCollection(
  {context, params, request, url}: Pick<CategoryRoute.LoaderArgs, 'context' | 'params' | 'request' | 'url'>,
  kind: 'category' | 'selection',
) {
  const {handle} = params;
  const {storefront, customerAccount} = context;
  const {sortKey, reverse} = getSortFromParams(url.searchParams);

  const {collection, productReviewSettings, errors} = await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      kind: kind === 'category' ? 'CATEGORY' : 'SMART_COLLECTION',
      ...getPaginationVariables(request, {pageBy: 24}),
      filters: getFiltersFromParams(url.searchParams),
      sortKey,
      reverse,
      buyer: await customerAccount.getBuyer(),
    },
  });

  if (!collection) throw missingResource(errors, `Collection ${handle} not found`);

  // The merchant's rating settings, for the cards (`ReviewDisplayProvider`).
  return {collection, reviewDisplay: productReviewSettings};
}

const COLLECTION_QUERY = `#graphql
  query Collection(
    $handle: String!
    $kind: CollectionKind!
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
    collection(handle: $handle, kind: $kind) {
      id
      handle
      title
      onlineStoreUrl
      description
      descriptionHtml
      image {
        url
        altText
        width
        height
      }
      seo {
        title
        description
      }
      breadcrumb {
        id
        title
        onlineStoreUrl
      }
      children(first: 50) {
        nodes {
          title
          onlineStoreUrl
        }
      }
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
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
          endCursor
          startCursor
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${LISTING_FILTER_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
