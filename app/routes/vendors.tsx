import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {PaginatedResourceSection, keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/vendors';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import type {VendorCardFragment} from 'storefrontapi.generated';
import {VENDOR_CARD_FRAGMENT, VendorCard} from '~/components/VendorCard';
import {ListingHeader} from '~/components/ListingHeader';
import {ButtonLink, buttonClass} from '~/components/ui/Button';
import {EmptyState} from '~/components/ui/EmptyState';
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
        <PaginatedResourceSection<VendorCardFragment>
          connection={vendors}
          resourcesClassName="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
          paginationClassName={`my-8 ${buttonClass('secondary', {fullWidth: true})}`}
          previousLabel={t('listing.loadPrevious')}
          nextLabel={t('listing.loadMore')}
          loadingLabel={t('listing.loading')}
        >
          {({node: vendor, index}) => (
            // The first row or two are the first screen (B-443).
            <VendorCard key={vendor.id} vendor={vendor} loading={index < 6 ? 'eager' : 'lazy'} />
          )}
        </PaginatedResourceSection>
      )}
    </div>
  );
}

const VENDORS_QUERY = `#graphql
  query Vendors($first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    vendorsConnection(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...VendorCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${VENDOR_CARD_FRAGMENT}
` as const;
