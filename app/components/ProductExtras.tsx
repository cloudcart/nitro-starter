import {type ReactNode, Suspense, useEffect, useId, useRef, useState} from 'react';
import {Await, Link, useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {Image, Money, useAutoLoad} from '@cloudcart/nitrogen-react';
import type {ProductExtrasQuery, RelatedProductsPageFragment} from 'storefrontapi.generated';
import {PRODUCT_GRID_CLASSES} from '~/components/ProductGrid';
import {ProductItem, ProductItemPlaceholder} from '~/components/ProductItem';
import {SectionHeading} from '~/components/SectionHeading';
import {Button} from '~/components/ui/Button';
import {storePath} from '~/lib/urls';
import type {clientLoader as productExtrasLoader} from '~/routes/product-extras.$handle';
import type {loader as relatedProductsLoader} from '~/routes/related-products';

/** A product's extras as its page has them: streamed with its document, asked as it opened, or none yet. */
export type Extras = Promise<ProductExtrasQuery | null> | ProductExtrasQuery | null | undefined;

/**
 * The extras a product page shows: those its document streamed, else — a page opened in the browser, whose route data
 * leaves them out — asked as the page opens, and again for each variant chosen (`routes/product-extras.$handle.tsx`).
 * `options` are the shown variant's options, as a query (`Color=Red&Size=M`).
 */
export function useProductExtras(streamed: Extras, handle: string, options: string): Extras {
  const {load, data} = useFetcher<typeof productExtrasLoader>();
  const address = `/product-extras/${encodeURIComponent(handle)}${options ? `?${options}` : ''}`;
  // Once an address: the effect runs again when nothing changed (React's strict mode).
  const askedRef = useRef<string | null>(null);
  useEffect(() => {
    if (streamed !== undefined || askedRef.current === address) return;
    askedRef.current = address;
    void load(address);
  }, [streamed, load, address]);
  return streamed !== undefined ? streamed : data?.extras;
}

/** A quiet panel of the info column with its title: buying in instalments, the store's own shops. */
function ExtraPanel({title, children}: {title: string; children: ReactNode}) {
  return (
    <section className="rounded-card bg-surface px-4 py-3">
      <h2 className="text-subheading">{title}</h2>
      <ul className="mt-1 divide-y divide-border">{children}</ul>
    </section>
  );
}

/** Buying on credit or in instalments, with the providers the store works with: the lowest monthly payment for each. */
export function CreditOffers({extras}: {extras: Extras}) {
  const {t} = useTranslation();

  return (
    <Suspense>
      <Await resolve={extras} errorElement={null}>
        {(data) => {
          // The API leaves out a provider with no plan for this amount, so every offer has one.
          const offers = data?.product?.selectedOrFirstAvailableVariant?.creditOffers ?? [];
          if (!offers.length) return null;

          return (
            <ExtraPanel title={t('product.instalments')}>
              {offers.map((offer) => {
                // sf gives the plans lowest monthly payment first, and never none (B-226).
                const cheapest = offer.plans[0]!;
                return (
                  <li key={offer.provider.handle} className="flex items-center gap-3 py-2.5">
                    {/* Every provider's logo in one box, so the names and amounts line up. */}
                    <span className="flex h-6 w-20 shrink-0 items-center">
                      {/* 24 px high: from the image CDN at 1×–3× when the merchant uploaded it, else the file as it is. */}
                      {offer.provider.imageUrl && (
                        <Image
                          src={offer.provider.imageUrl}
                          alt=""
                          width="auto"
                          height={24}
                          className="max-h-full w-auto object-contain"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-small text-muted">{offer.provider.title}</span>
                    <span className="flex shrink-0 flex-col items-end">
                      <Money data={cheapest.monthlyPayment}>
                        {(amount) => <span className="font-medium">{t('product.instalmentMonthly', {amount})}</span>}
                      </Money>
                      <span className="text-small text-muted">
                        {t('product.instalmentMonths', {count: cheapest.months})}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ExtraPanel>
          );
        }}
      </Await>
    </Suspense>
  );
}

/** The store's own shops where the product can be picked up. */
export function StoreAvailability({extras}: {extras: Extras}) {
  const {t} = useTranslation();

  return (
    <Suspense>
      <Await resolve={extras} errorElement={null}>
        {(data) => {
          const stores = data?.product?.stockByStore ?? [];
          if (!stores.length) return null;

          return (
            <ExtraPanel title={t('product.inStores')}>
              {stores.map(({store}) => (
                <li key={store.id} className="flex items-center justify-between gap-3 py-2.5">
                  {store.urlHandle ? (
                    <Link to={storePath(store.urlHandle)} className="font-medium">
                      {store.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{store.name}</span>
                  )}
                  {store.city && <span className="text-small text-muted">{store.city}</span>}
                </li>
              ))}
            </ExtraPanel>
          );
        }}
      </Await>
    </Suspense>
  );
}

/** The most products a page of "You may also like" holds: two rows of four, a desktop's. */
export const RELATED_PAGE_MAX = 8;

/** How many pages "You may also like" loads by itself after its first, before "Load more" waits for a click. */
const RELATED_AUTO_PAGES = 3;

/** A page of "You may also like", as the `related-products` route gives it. */
export const RELATED_PRODUCTS_FRAGMENT = `#graphql
  fragment RelatedProductsPage on ProductConnection {
    nodes {
      ...ProductItem
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
` as const;

/** Two rows of card placeholders at any width: the 5th and 6th from three a row, the 7th and 8th from four. */
const PLACEHOLDERS = ['', '', '', '', 'hidden md:block', 'hidden md:block', 'hidden lg:block', 'hidden lg:block'];

/**
 * "You may also like", endless: the API's `relatedProducts` without the linked products, which the info column's
 * carousel shows (T-550) — the category's, two, three or four to a row. Nothing is asked until the visitor nears it
 * (the user: resources are spent on what the visitor goes to see): two rows of card placeholders hold its place, so
 * nothing below moves when the products come. Then two rows at a time, as many as the grid lays out: three pages by
 * themselves as the visitor nears the end, then "Load more" waits for a click, so the footer can be reached. Nothing
 * when the category has no other product.
 */
export function RelatedProducts({handle}: {handle: string}) {
  const {t} = useTranslation();
  const titleId = useId();
  const fetcher = useFetcher<typeof relatedProductsLoader>();
  // The pages loaded, each added once as the fetcher brings it; `from` is the answer last added.
  const [loaded, setLoaded] = useState<{pages: RelatedProductsPageFragment[]; from: unknown}>({pages: [], from: null});
  if (fetcher.data && fetcher.data !== loaded.from) {
    const page = fetcher.data.related;
    setLoaded({pages: page ? [...loaded.pages, page] : loaded.pages, from: fetcher.data});
  }

  const answered = loaded.from !== null;
  const products = loaded.pages.flatMap((page) => page.nodes);
  const {hasNextPage, endCursor} = loaded.pages.at(-1)?.pageInfo ?? {hasNextPage: false, endCursor: null};
  const busy = fetcher.state !== 'idle';
  const gridRef = useRef<HTMLUListElement>(null);
  const load = () => {
    // Two rows at the columns the grid has at this width.
    const grid = gridRef.current;
    const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const params = new URLSearchParams({handle, first: String(Math.min(2 * (columns || 4), RELATED_PAGE_MAX))});
    if (endCursor) params.set('after', endCursor);
    void fetcher.load(`/related-products?${params}`);
  };

  // The first page as the section nears the viewport; the next ones as "Load more" does.
  const sectionRef = useRef<HTMLElement>(null);
  useAutoLoad(sectionRef, {load, limit: 1, paused: answered || busy});
  const moreRef = useRef<HTMLButtonElement>(null);
  const {restart} = useAutoLoad(moreRef, {load, limit: RELATED_AUTO_PAGES, paused: !answered || busy || !hasNextPage});

  if (answered && !products.length) return null;

  return (
    <section ref={sectionRef} aria-labelledby={titleId} aria-busy={busy || undefined}>
      <SectionHeading id={titleId} title={t('product.related.alsoLike')} />
      <ul ref={gridRef} className={`grid gap-x-4 gap-y-8 ${PRODUCT_GRID_CLASSES}`}>
        {answered
          ? products.map((product) => (
              <li key={product.id}>
                <ProductItem product={product} loading="lazy" />
              </li>
            ))
          : PLACEHOLDERS.map((shown, index) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- placeholders: a place each, nothing else
              <li key={index} aria-hidden="true" className={shown}>
                <ProductItemPlaceholder />
              </li>
            ))}
      </ul>
      {hasNextPage && (
        <div className="mt-10 flex justify-center">
          <Button
            ref={moreRef}
            variant="secondary"
            loading={busy}
            onClick={() => {
              restart();
              load();
            }}
          >
            {busy ? t('listing.loading') : t('listing.loadMore')}
          </Button>
        </div>
      )}
    </section>
  );
}
