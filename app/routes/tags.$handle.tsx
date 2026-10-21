import {useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/tags.$handle';
import {crumbsJsonLd, listingUrl, metaTranslator, seoMeta, storeName} from '~/lib/meta';
import {ListingHeader} from '~/components/ListingHeader';
import {ProductListing} from '~/components/ProductListing';
import {getFiltersFromParams, getSortFromParams} from '~/lib/filters';
import {LISTING_FILTER_FRAGMENT, PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {productTagPath} from '~/lib/urls';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT, ReviewDisplayProvider} from '~/components/ReviewDisplay';
import {ListingDescription} from '~/components/ListingDescription';
import {listedProducts} from '~/lib/analytics';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  // A page that throws is titled by the root's `meta`.
  if (!data) return [];
  const {tag} = data;
  const path = productTagPath(tag.handle);
  return seoMeta(matches, {
    title: tag.seo.title || tag.title,
    description:
      tag.seo.description ||
      tag.description.slice(0, 160) ||
      metaTranslator(matches)('seo.productTag', {tag: tag.title, store: storeName(matches)}),
    url: listingUrl(matches, path, location.search),
    jsonLd: crumbsJsonLd(matches, [{title: tag.title}], path),
  });
};

export const shouldRevalidate = skipCartAndWishlistRevalidation;

/** /tags/{handle} — the products the merchant gave a tag. */
export async function loader({context, params, request, url}: Route.LoaderArgs) {
  const {sortKey, reverse} = getSortFromParams(url.searchParams);

  const {
    productTag: tag,
    productReviewSettings,
    errors,
  } = await context.storefront.query(PRODUCT_TAG_QUERY, {
    variables: {
      handle: params.handle,
      ...getPaginationVariables(request, {pageBy: 24}),
      filters: getFiltersFromParams(url.searchParams),
      sortKey,
      reverse,
      buyer: await context.customerAccount.getBuyer(),
    },
  });

  if (!tag) throw missingResource(errors, `Tag ${params.handle} not found`);

  return {tag, reviewDisplay: productReviewSettings};
}

export default function ProductTag() {
  const {tag, reviewDisplay} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={[{title: tag.title}]} title={tag.title} />
      <ReviewDisplayProvider value={reviewDisplay}>
        <ProductListing
          products={tag.products}
          after={<ListingDescription html={tag.descriptionHtml} className="mt-16" />}
        />
      </ReviewDisplayProvider>
      <Analytics.TagView
        data={{tag: {id: tag.id, handle: tag.handle, title: tag.title}, products: listedProducts(tag.products.nodes)}}
      />
    </div>
  );
}

const PRODUCT_TAG_QUERY = `#graphql
  query ProductTag(
    $handle: String!
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
    productTag(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      seo {
        title
        description
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
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${LISTING_FILTER_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
