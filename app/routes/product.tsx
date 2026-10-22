import {Outlet, type ShouldRevalidateFunction} from 'react-router';
import {getPaginationVariables} from '@cloudcart/nitrogen';
import {keptRouteData} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/product';
import {
  REVIEWS_NAMESPACE,
  REVIEWS_PAGE_SIZE,
  reviewRatingFilter,
  splitReviewsSearch,
} from '~/components/ProductReviews';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {loadProductPageSettings} from '~/lib/product-page';

/**
 * A product page's data that does not follow its variant: the reviews (B-376). The page (`product.$handle`) reloads
 * its own for the variant each address names; this route reloads only for another product, another page or star
 * filter of the reviews, or a form sent (a review) — choosing a variant asks it nothing.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  const {formMethod, currentUrl, nextUrl, currentParams, nextParams} = args;
  if ((formMethod && formMethod !== 'GET') || currentUrl.href === nextUrl.href)
    return skipCartAndWishlistRevalidation(args);
  return (
    currentParams.handle !== nextParams.handle ||
    splitReviewsSearch(currentUrl).reviews !== splitReviewsSearch(nextUrl).reviews
  );
};

/**
 * In the browser the reviews come after the page, never holding it: a product opened from data this tab kept
 * (`keptPageLoader` on `product.$handle`) shows at once, and its reviews follow. A step back or forward gives back the
 * reviews the page had (`keptRouteData`, by this route's id), with no request (B-556).
 */
export function clientLoader({url, serverLoader}: Route.ClientLoaderArgs) {
  const fromServer = () => ({reviews: serverLoader().then((data) => data.reviews)});
  return keptRouteData<ReturnType<typeof fromServer>>('routes/product', {url}) ?? fromServer();
}

/**
 * Only what the reviews section shows: nothing when the store shows no reviews, and the list, with its own star filter
 * and pages beside the variant's options in the URL, only when the merchant shows more than the overall rating. Not
 * awaited: the page renders without it, and a failure stays a failure, which the section says, never "No reviews yet"
 * (B-425).
 */
export function loader({context, params, request, url}: Route.LoaderArgs) {
  // `/product` alone names no product.
  if (!params.handle) throw new Response(`${url.pathname} not found`, {status: 404});
  const {storefront} = context;
  const {handle} = params;

  const reviews = loadProductPageSettings({context})
    .then(({productReviewSettings: display}) =>
      display
        ? storefront.query(PRODUCT_REVIEWS_QUERY, {
            variables: {
              handle,
              withList: !display.summaryOnly,
              rating: reviewRatingFilter(url.searchParams),
              ...getPaginationVariables(request, {pageBy: REVIEWS_PAGE_SIZE, namespace: REVIEWS_NAMESPACE}),
            },
            cache: storefront.CacheShort(),
          })
        : null,
    )
    .catch((error: Error) => {
      console.error(error);
      throw error;
    });

  return {reviews};
}

export default function ProductLayout() {
  return <Outlet />;
}

const PRODUCT_REVIEWS_QUERY = `#graphql
  fragment ProductReviewItem on ProductReview {
    id
    rating
    title
    comment
    createdAt
    author {
      name
      initials
    }
  }
  query ProductReviews(
    $handle: String!
    $withList: Boolean!
    $rating: Int
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) {
    product(handle: $handle) {
      reviewSummary {
        averageRating
        totalCount
        ratingDistribution {
          rating
          count
        }
      }
      reviews(first: $first, last: $last, before: $startCursor, after: $endCursor, rating: $rating)
        @include(if: $withList) {
        nodes {
          ...ProductReviewItem
          answers {
            ...ProductReviewItem
          }
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
` as const;
