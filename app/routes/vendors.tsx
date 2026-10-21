import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {Image, PaginatedResourceSection, keptPageLoader, KeptLink} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/vendors';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import type {VendorItemFragment} from 'storefrontapi.generated';
import {ListingHeader} from '~/components/ListingHeader';
import {ButtonLink, buttonClass} from '~/components/ui/Button';
import {EmptyState} from '~/components/ui/EmptyState';
import {vendorPath} from '~/lib/urls';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({location, matches}) => {
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: t('menu.brands'),
    path: '/vendors',
    search: location.search,
    description: t('seo.vendors', {store: storeName(matches)}),
    crumbs: [{title: t('menu.brands')}],
  });
};

/** /vendors — the brands the store sells. */
export async function loader({context, request}: Route.LoaderArgs) {
  const {vendorsConnection} = await context.storefront.query(VENDORS_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 48}),
  });

  return {vendors: vendorsConnection};
}

export default function Vendors() {
  const {t} = useTranslation();
  const {vendors} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={[{title: t('menu.brands')}]} title={t('menu.brands')} />
      {!vendors.nodes.length ? (
        // None (B-411): the whole catalogue as the way on.
        <EmptyState
          text={t('listing.noBrands')}
          action={
            <ButtonLink to="/products" prefetch="intent" variant="secondary">
              {t('listing.allProducts')}
            </ButtonLink>
          }
        />
      ) : (
        <PaginatedResourceSection<VendorItemFragment>
          connection={vendors}
          resourcesClassName="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
          paginationClassName={`my-8 ${buttonClass('secondary', {fullWidth: true})}`}
          previousLabel={t('listing.loadPrevious')}
          nextLabel={t('listing.loadMore')}
          loadingLabel={t('listing.loading')}
        >
          {({node: vendor, index}) => (
            <KeptLink
              key={vendor.id}
              to={vendorPath(vendor.handle)}
              className="flex flex-col items-center gap-3 rounded-card border border-border p-4 text-center hover:border-foreground hover:no-underline"
            >
              <div className="flex h-16 w-full items-center justify-center">
                {vendor.image ? (
                  <Image
                    data={vendor.image}
                    // The vendor's name is beside the logo, so the logo adds nothing to read.
                    alt=""
                    width={160}
                    // The first row or two are the first screen (B-443).
                    loading={index < 6 ? 'eager' : 'lazy'}
                    className="max-h-16 w-auto object-contain"
                  />
                ) : (
                  <span aria-hidden="true" className="text-h3 text-border">
                    {vendor.title.slice(0, 1)}
                  </span>
                )}
              </div>
              <span className="font-medium">{vendor.title}</span>
            </KeptLink>
          )}
        </PaginatedResourceSection>
      )}
    </div>
  );
}

const VENDORS_QUERY = `#graphql
  fragment VendorItem on Vendor {
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
  }
  query Vendors($first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    vendorsConnection(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...VendorItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
` as const;
