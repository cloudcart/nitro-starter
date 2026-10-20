import {type ReactNode, useLayoutEffect} from 'react';
import {matchPath} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {BreadcrumbsPlaceholder} from '~/components/Breadcrumbs';
import {ListingHeaderPlaceholder} from '~/components/ListingHeader';
import {LISTING_COLUMNS, LISTING_GRID_CLASSES, LISTING_TOOLBAR, useListingDensity} from '~/components/ListingToolbar';
import {ProductItemPlaceholder} from '~/components/ProductItem';
import {GalleryPlaceholder, PRODUCT_TITLE, PRODUCT_VENDOR, ProductColumns} from '~/components/ProductLayout';
import {Price} from '~/components/ui/Price';
import type {Opening, Pending} from '~/lib/opening';

/** The page box every page below the header stands in. */
const PAGE = 'mx-auto max-w-page px-gutter py-8 md:px-gutter-md';

/** The cards a listing being opened shows the room of: a first screen's worth in either density. */
const PENDING_CARDS = 6;

/** The pages that show at once while they load, by their paths; the rest keep the page left until theirs comes. */
const VIEWS: Array<[pattern: string, view: (opening: Opening) => ReactNode]> = [
  ['/product/:handle', (opening) => <ProductPending opening={opening} />],
  ...['/category/:handle', '/vendor/:handle', '/tags/:handle', '/selection/:handle', '/products'].map(
    (pattern): [string, (opening: Opening) => ReactNode] => [
      pattern,
      (opening) => <ListingPending title={opening.title} />,
    ],
  ),
  ['/search', () => <SearchPending />],
  ['/page/:handle', (opening) => <ContentPending title={opening.title} />],
  ['/article/:handle', (opening) => <ArticlePending title={opening.title} />],
];

/** Whether a page shows at once while it loads (`PendingPage`). */
export function hasPendingView(pathname: string): boolean {
  return VIEWS.some(([pattern]) => matchPath(pattern, pathname));
}

/**
 * The page the visitor opened, at once, while its data loads (T-571): its frame as the page lays it out, and what the
 * link already showed — a product card's picture, title and price, a link's name as the page's title — where the page
 * puts them; the room of the rest is held by plain shapes, hidden from assistive technology. The page's data then
 * replaces it in place. It opens at the top, as the page will.
 */
export function PendingPage({location, opening}: Pending) {
  // A statement, not the arrow's value: Chrome's `scrollTo` now returns a promise, which React would call on unmount.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const view = VIEWS.find(([pattern]) => matchPath(pattern, location.pathname))?.[1];

  return (
    <div aria-busy="true" data-pending-page className="min-h-pending-page">
      {view?.(opening)}
    </div>
  );
}

/** A product page's top: the card's picture in the gallery, its vendor, title and price in the info column. */
function ProductPending({opening}: {opening: Opening}) {
  const {product} = opening;
  const title = product?.title ?? opening.title;

  return (
    <div className={PAGE}>
      <BreadcrumbsPlaceholder />
      <ProductColumns
        gallery={
          <GalleryPlaceholder image={product?.image} picture={opening.picture} pictures={product?.pictures ?? 1} />
        }
        info={
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              {product?.vendor && <p className={PRODUCT_VENDOR}>{product.vendor}</p>}
              <div className="flex items-start justify-between gap-4">
                {title ? <h1 className={PRODUCT_TITLE}>{title}</h1> : <Line className="w-3/4 text-product" />}
                {/* The heart's room (`WishlistButton`), so the title wraps where the page wraps it. */}
                <span className="size-10 shrink-0" />
              </div>
            </div>
            {product?.price ? (
              <Price price={product.price} compareAtPrice={product.compareAtPrice} className="text-h4" />
            ) : (
              <Line className="w-1/4 text-h4" />
            )}
            <div aria-hidden="true" className="flex flex-col gap-3">
              <span className="h-lh w-24 bg-surface text-small" />
              <span className="h-11 bg-surface" />
              <span className="mt-3 h-12 bg-surface" />
            </div>
          </div>
        }
      />
    </div>
  );
}

/** A listing: its title as the link named it, the toolbar's row and a first screen of cards' room. */
function ListingPending({title, underHeader}: {title?: string; underHeader?: ReactNode}) {
  const [density] = useListingDensity();

  return (
    <div className={PAGE}>
      <ListingHeaderPlaceholder title={title} />
      {underHeader}
      <div className={LISTING_COLUMNS}>
        <div aria-hidden="true" className="hidden lg:block">
          <div className="flex min-h-11 items-center border-b border-border pb-3">
            <span className="h-lh w-24 bg-surface text-subheading" />
          </div>
          {Array.from({length: 4}, (_, index) => (
            <div key={index} className="border-b border-border py-4">
              <span className="block h-lh w-1/2 bg-surface" />
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div aria-hidden="true" className={LISTING_TOOLBAR}>
            {/* As high as the row's controls: the filters' pill below 990 px, the sort's line beside the filters. */}
            <span className="h-11 w-28 bg-surface lg:h-8 lg:w-24" />
            <span className="ml-auto h-11 w-28 bg-surface lg:h-8" />
          </div>
          <div className={`mt-6 grid gap-x-4 gap-y-8 ${LISTING_GRID_CLASSES[density]}`}>
            {Array.from({length: PENDING_CARDS}, (_, index) => (
              <ProductItemPlaceholder key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The search's results: the page's own title, its search box's room, then the listing's. */
function SearchPending() {
  const {t} = useTranslation();
  return (
    <ListingPending
      title={t('search.title')}
      underHeader={
        <div aria-hidden="true" className="mb-10 flex max-w-column gap-2">
          <span className="h-11 min-w-0 flex-1 bg-surface" />
          <span className="h-11 w-24 bg-surface" />
        </div>
      }
    />
  );
}

/** A page of the merchant's: its title in the reading column, its text's room under it. */
function ContentPending({title}: {title?: string}) {
  return (
    <div className={PAGE}>
      <BreadcrumbsPlaceholder />
      <div className="mx-auto flex max-w-reading flex-col gap-8">
        {title ? <h1 className="text-title">{title}</h1> : <Line className="w-2/3 text-title" />}
        <TextPlaceholder />
      </div>
    </div>
  );
}

/**
 * An article: its title as the blog's card named it, centred as the article's header has it, its text's room under it.
 * Not the card's picture: the article asks for its own size of it, and would show nothing there until it came.
 */
function ArticlePending({title}: {title?: string}) {
  return (
    <div className={PAGE}>
      <BreadcrumbsPlaceholder />
      <div className="mx-auto flex max-w-reading flex-col items-center gap-4 text-center">
        <Line className="w-24 text-small" />
        {title ? <h1 className="text-title">{title}</h1> : <Line className="w-2/3 text-title" />}
      </div>
      <div className="mx-auto mt-10 max-w-reading">
        <TextPlaceholder />
      </div>
    </div>
  );
}

/** A line's room in the type of what will stand there. */
function Line({className}: {className: string}) {
  return <span aria-hidden="true" className={`block h-lh bg-surface ${className}`} />;
}

/** A paragraph's room. */
function TextPlaceholder() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <span className="block h-lh w-full bg-surface" />
      <span className="block h-lh w-full bg-surface" />
      <span className="block h-lh w-11/12 bg-surface" />
      <span className="block h-lh w-full bg-surface" />
      <span className="block h-lh w-2/3 bg-surface" />
    </div>
  );
}
