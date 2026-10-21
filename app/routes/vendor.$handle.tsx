import {useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables, useTranslation, type Translate} from '@cloudcart/nitrogen';
import {Image, keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/vendor.$handle';
import {crumbsJsonLd, listingUrl, metaTranslator, seoMeta, storeName} from '~/lib/meta';
import type {Crumb} from '~/components/Breadcrumbs';
import {ListingHeader} from '~/components/ListingHeader';
import {ProductListing} from '~/components/ProductListing';
import {getFiltersFromParams, getSortFromParams} from '~/lib/filters';
import {LISTING_FILTER_FRAGMENT, PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {vendorPath} from '~/lib/urls';
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
  const {vendor} = data;
  const path = vendorPath(vendor.handle);
  const t = metaTranslator(matches);
  return seoMeta(matches, {
    title: vendor.seo.title || vendor.title,
    description:
      vendor.seo.description ||
      vendor.description.slice(0, 160) ||
      t('seo.vendor', {vendor: vendor.title, store: storeName(matches)}),
    url: listingUrl(matches, path, location.search),
    image: vendor.image ?? undefined,
    jsonLd: crumbsJsonLd(matches, vendorCrumbs(vendor.title, t), path),
  });
};

/** The brand's breadcrumb: the brands, then the brand. */
function vendorCrumbs(title: string, t: Translate): Crumb[] {
  return [{title: t('menu.brands'), to: '/vendors'}, {title}];
}

export const shouldRevalidate = skipCartAndWishlistRevalidation;

/** /vendor/{handle} — a brand and its products. */
export async function loader({context, params, request, url}: Route.LoaderArgs) {
  const {sortKey, reverse} = getSortFromParams(url.searchParams);

  const {vendor, productReviewSettings, errors} = await context.storefront.query(VENDOR_QUERY, {
    variables: {
      handle: params.handle,
      ...getPaginationVariables(request, {pageBy: 24}),
      filters: getFiltersFromParams(url.searchParams),
      sortKey,
      reverse,
      buyer: await context.customerAccount.getBuyer(),
    },
  });

  if (!vendor) throw missingResource(errors, `Brand ${params.handle} not found`);

  return {vendor, reviewDisplay: productReviewSettings};
}

export default function Vendor() {
  const {t} = useTranslation();
  const {vendor, reviewDisplay} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader
        crumbs={vendorCrumbs(vendor.title, t)}
        title={vendor.title}
        media={
          vendor.image && (
            <Image
              data={vendor.image}
              // The vendor's name is the page's heading — on a phone read by screen readers only — so the logo adds
              // nothing to read.
              alt=""
              width={160}
              // At the page's top: loaded at once (B-443).
              loading="eager"
              className="h-16 w-auto max-w-full object-contain object-left"
            />
          )
        }
      />
      <ReviewDisplayProvider value={reviewDisplay}>
        <ProductListing
          products={vendor.products}
          after={<ListingDescription html={vendor.descriptionHtml} className="mt-16" />}
        />
      </ReviewDisplayProvider>
      <Analytics.VendorView
        data={{
          vendor: {id: vendor.id, handle: vendor.handle, title: vendor.title},
          products: listedProducts(vendor.products.nodes),
        }}
      />
    </div>
  );
}

const VENDOR_QUERY = `#graphql
  query Vendor(
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
    vendor(handle: $handle) {
      id
      title
      handle
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
