import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {PaginatedResourceSection, keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/categories';
import type {CategoryItemFragment} from 'storefrontapi.generated';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import {COLLECTION_CARD_FRAGMENT, CollectionCard} from '~/components/CollectionGrid';
import {ListingHeader} from '~/components/ListingHeader';
import {ButtonLink, buttonClass} from '~/components/ui/Button';
import {EmptyState} from '~/components/ui/EmptyState';
import {collectionPath} from '~/lib/urls';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

/**
 * A category's picture width in the page, for the browser to pick its size (B-393): two columns, three from 990 px, with
 * 1rem gaps in the page box (90rem, gutters of 2.5rem from 750 px and 1.25rem below).
 */
const CATEGORY_CARD_SIZES =
  '(min-width: 1440px) 443px, (min-width: 990px) calc(33.34vw - 37px), (min-width: 750px) calc(50vw - 48px), calc(50vw - 28px)';

export const meta: Route.MetaFunction = ({location, matches}) => {
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: t('menu.categories'),
    path: '/categories',
    search: location.search,
    description: t('seo.categories', {store: storeName(matches)}),
    crumbs: [{title: t('menu.categories')}],
  });
};

/** /categories — the store's categories, top level first, each with its subcategories. */
export async function loader({context, request}: Route.LoaderArgs) {
  // What the store's own categories page lists: the top-level categories with products, in the merchant's order.
  const {collections} = await context.storefront.query(CATEGORIES_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 48}),
  });

  return {categories: collections};
}

export default function Categories() {
  const {t} = useTranslation();
  const {categories} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={[{title: t('menu.categories')}]} title={t('menu.categories')} />
      {!categories.nodes.length ? (
        // None (B-411): the whole catalogue as the way on.
        <EmptyState
          text={t('listing.noCategories')}
          action={
            <ButtonLink to="/products" prefetch="intent" variant="secondary">
              {t('listing.allProducts')}
            </ButtonLink>
          }
        />
      ) : (
        <PaginatedResourceSection<CategoryItemFragment>
          connection={categories}
          resourcesClassName="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3"
          paginationClassName={`my-8 ${buttonClass('secondary', {fullWidth: true})}`}
          previousLabel={t('listing.loadPrevious')}
          nextLabel={t('listing.loadMore')}
          loadingLabel={t('listing.loading')}
        >
          {({node: category, index}) => (
            <div key={category.id} className="flex flex-col gap-2">
              <CollectionCard
                collection={category}
                loading={index < 6 ? 'eager' : 'lazy'}
                sizes={CATEGORY_CARD_SIZES}
              />
              {category.children.nodes.length > 0 && (
                // Each link at least 24 px high, so a tap lands on the one meant (WCAG 2.5.8, B-431).
                <ul className="flex flex-col text-small text-muted">
                  {category.children.nodes.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={collectionPath(child)}
                        className="inline-flex min-h-6 items-center hover:text-foreground"
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PaginatedResourceSection>
      )}
    </div>
  );
}

const CATEGORIES_QUERY = `#graphql
  fragment CategoryItem on Collection {
    ...CollectionCard
    children(first: 20) {
      nodes {
        id
        title
        onlineStoreUrl
      }
    }
  }
  query Categories($first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    collections(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      topLevel: true
      withProducts: true
      sortKey: MANUAL
    ) {
      nodes {
        ...CategoryItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${COLLECTION_CARD_FRAGMENT}
` as const;
