import {type ReactNode, useRef} from 'react';
import {useLocation, useNavigation, useSearchParams} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {PaginatedResourceSection} from '@cloudcart/nitrogen-react';
import type {ListingFilterFragment, ProductItemFragment} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {
  DensityToggle,
  LISTING_CARD_SIZES,
  LISTING_GRID_CLASSES,
  ListingCount,
  SortSelect,
  useListingDensity,
} from '~/components/ListingToolbar';
import {ProductItem} from '~/components/ProductItem';
import {
  ActiveFilters,
  activeFilterCount,
  FilterPanel,
  FiltersButton,
  FilterSidebar,
  usableFilters,
  useFitsBeside,
} from '~/components/ProductFilters';
import {buttonClass, ButtonLink} from '~/components/ui/Button';
import {EmptyState} from '~/components/ui/EmptyState';
import {FilterIcon} from '~/components/ui/icons';
import {clearFilterParams, hasFilterParams, type SortLabel} from '~/lib/filters';
import {rememberListing} from '~/lib/listing-context';

type ProductConnection = {
  nodes: ProductItemFragment[];
  pageInfo: {hasPreviousPage: boolean; hasNextPage: boolean; startCursor?: string | null; endCursor?: string | null};
  filters?: ListingFilterFragment[];
  totalCount?: number | null;
};

/** Pages loaded by themselves as the visitor scrolls, before "Load more" waits for a click and the footer shows. */
const AUTO_LOAD_PAGES = 3;

/**
 * A product listing: from 990 px the filters in a column at the side, moving with the page (below, a drawer);
 * beside them a row of the count, the chosen filters as chips, the sort and the grid's density, then the products,
 * the next pages loading as the visitor scrolls, with a real "Load more" link under them, and what the page puts under
 * them.
 */
export function ProductListing({
  products,
  filters = products.filters ?? [],
  defaultSort,
  after,
}: {
  products: ProductConnection;
  filters?: ListingFilterFragment[];
  /** The store's own order, as the sort names it: `relevance` on search results. */
  defaultSort?: SortLabel;
  /** What goes under the products, in their column: the merchant's description of the listing. */
  after?: ReactNode;
}) {
  const {t} = useTranslation();
  const [searchParams] = useSearchParams();
  const [density, setDensity] = useListingDensity();
  const usable = usableFilters(filters);
  const chosen = activeFilterCount(usable, searchParams);
  // Filters in the URL, whether or not the API still offers their facets (an empty result may offer none).
  const filtered = hasFilterParams(searchParams);
  const pending = useListingPending();
  // The filter button's name shows where the whole pill fits on the toolbar's line beside the sort and the density
  // (T-566).
  const rowRef = useRef<HTMLDivElement>(null);
  const filtersCopyRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const filtersNamed = useFitsBeside(rowRef, filtersCopyRef, restRef);

  return (
    <div className="lg:grid lg:grid-cols-[var(--container-filters)_minmax(0,1fr)] lg:gap-10">
      <FilterSidebar filters={usable} className="hidden lg:block" />
      <Aside type="filters" heading={t('filters.title')} side="left">
        <FilterPanel filters={usable} totalCount={products.totalCount} />
      </Aside>
      <div className="min-w-0">
        {/* Below 990 px the row stays at the screen's top, under the header while it shows and in its place when it
            slides away (`header-hidden:`), edge to edge on the page's background. From 990 px it is as high as the
            filters' heading row beside it (`h-11`, its padding and line in it), its controls on the same middle and
            its line on that row's line (T-543). */}
        <div
          ref={rowRef}
          data-listing-toolbar
          className="-mx-gutter flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-background px-gutter py-3 lg:h-11 max-lg:sticky max-lg:top-16 max-lg:z-30 max-lg:transition-[top] max-lg:duration-300 max-lg:ease-out max-lg:header-hidden:top-0 md:-mx-gutter-md md:px-gutter-md lg:mx-0 lg:px-0 lg:pt-0"
        >
          <FiltersButton chosen={chosen} named={filtersNamed} copyRef={filtersCopyRef} className="lg:hidden" />
          {products.totalCount != null && <ListingCount count={products.totalCount} />}
          {/* The chosen filters above the row's line (T-554): from 990 px in the room before the sort, below it a line of
              their own at the row's end. */}
          <ActiveFilters filters={usable} className="order-last basis-full lg:order-none lg:flex-1 lg:basis-0" />
          <div ref={restRef} className="ml-auto flex items-center gap-4">
            <SortSelect defaultSort={defaultSort} />
            <DensityToggle value={density} onChange={setDensity} />
          </div>
        </div>
        {/* Dimmed while the listing the visitor asked for — other filters, another order — is on its way (B-238). */}
        {/* Opening a product remembers this listing's order, for a swipe on the product page to the next one. */}
        <div
          aria-busy={pending || undefined}
          onClickCapture={rememberListing}
          className={`mt-6 transition-opacity ${pending ? 'opacity-50' : ''}`}
        >
          {/* The cards' titles are `h3`s, as in the home's sections: this names the level between them and the page's `h1`. */}
          <h2 className="sr-only">{t('listing.products')}</h2>
          {products.nodes.length ? (
            <PaginatedResourceSection<ProductItemFragment>
              connection={products}
              autoLoad={AUTO_LOAD_PAGES}
              ariaLabel={t('listing.products')}
              resourcesClassName={`grid gap-x-4 gap-y-8 ${LISTING_GRID_CLASSES[density]}`}
              paginationClassName={`${buttonClass('secondary')} mx-auto my-10 flex w-fit`}
              nextLabel={t('listing.loadMore')}
              previousLabel={t('listing.loadPrevious')}
              loadingLabel={t('listing.loading')}
            >
              {({node: product, index}) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  loading={index < 8 ? 'eager' : undefined}
                  sizes={LISTING_CARD_SIZES[density]}
                />
              )}
            </PaginatedResourceSection>
          ) : (
            // Nothing the chosen filters let through: the way out of them. Nothing in the listing at all: the
            // categories, the way on (B-437).
            <EmptyState
              icon={FilterIcon}
              text={filtered ? t('filters.noMatch') : t('listing.empty')}
              action={
                filtered ? (
                  <ButtonLink to={`?${clearFilterParams(searchParams)}`} preventScrollReset variant="secondary">
                    {t('filters.clearAll')}
                  </ButtonLink>
                ) : (
                  <ButtonLink to="/categories" prefetch="intent" variant="secondary">
                    {t('actions.browseCategories')}
                  </ButtonLink>
                )
              }
            />
          )}
        </div>
        {after}
      </div>
    </div>
  );
}

/** Whether the listing the visitor asked for — other filters or another order, not the next page — is on its way. */
function useListingPending() {
  const {pathname} = useLocation();
  const next = useNavigation().location;
  return Boolean(next && next.pathname === pathname && !new URLSearchParams(next.search).has('cursor'));
}
