import {KeptLink} from '@cloudcart/nitrogen-react';
import {type ReactNode, type RefObject, useEffect, useRef, useState} from 'react';
import {Form, useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {SearchProductFragment} from 'storefrontapi.generated';
import {SearchProductCard, SearchProductCardPlaceholder} from '~/components/SearchProductCard';
import {ButtonLink} from '~/components/ui/Button';
import {CloseIcon, SearchIcon} from '~/components/ui/icons';
import {RECENTLY_VIEWED, useProductList} from '~/lib/product-lists';
import type {loader as searchStartLoader} from '~/routes/search-start';
import {
  getEmptyPredictiveSearchResult,
  SEARCH_ENDPOINT,
  SEARCH_PARAM,
  type PredictiveSearchReturn,
  rememberSearch,
  searchUrl,
} from '~/lib/search';
import {articlePath, collectionPath, pagePath, vendorPath} from '~/lib/urls';

/** How long typing rests before the results are fetched: a call to the API per pause, not per key. */
const DEBOUNCE_MS = 200;

/** The shortest term searched for, as Aura Search's own: one letter matches too much to help. */
const MIN_TERM = 2;

/** How many of each kind the search asks for: three rows of four products. */
const LIMIT = 12;

/** How many products each list of the empty search shows: one row. */
const START_PRODUCTS = 4;

/** How many category and brand chips show. */
const MAX_CHIPS = 8;

type Items = PredictiveSearchReturn['result']['items'];

/**
 * The search: its first row is the input, with "Clear" while it holds text and the close button. Before the visitor
 * types two characters, the products they viewed lately and the store's best sellers; then the categories and brands
 * the search matches as chips, the products as cards with "View all" over a fade, and the pages and articles.
 * Results load when typing pauses, from the search page's loader; a status tells screen readers how many there are.
 * Enter, or "View all", opens the search page; following anything calls `onNavigate`.
 */
export function PredictiveSearch({
  inputRef,
  onNavigate,
  onClose,
}: {
  /** The input, for the dialog to focus it when it opens. */
  inputRef: RefObject<HTMLInputElement | null>;
  onNavigate: () => void;
  /** The close button: the search closes without going anywhere. */
  onClose: () => void;
}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<PredictiveSearchReturn>();
  const start = useSearchStart();
  const [term, setTerm] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searched = term.trim();
  const searching = Array.from(searched).length >= MIN_TERM;

  // What the panel shows is kept: the search page for its term opens on its products at once (T-574).
  useEffect(() => {
    if (fetcher.data) rememberSearch(fetcher.data);
  }, [fetcher.data]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onChange = (value: string) => {
    setTerm(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = value.trim();
    if (Array.from(next).length < MIN_TERM) return;
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams({[SEARCH_PARAM]: next, limit: String(LIMIT), predictive: ''});
      void fetcher.load(`${SEARCH_ENDPOINT}?${params}`);
    }, DEBOUNCE_MS);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No submit button: Enter, or the phone keyboard's search key, opens the search page. The row's lower edge
          takes the accent while the input has the focus. */}
      <Form
        role="search"
        action={SEARCH_ENDPOINT}
        method="get"
        onSubmit={onNavigate}
        className="flex shrink-0 items-center gap-1 border-b border-border pr-2 pl-5 focus-within:border-accent"
      >
        <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="search"
          name={SEARCH_PARAM}
          value={term}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 min-w-0 flex-1 bg-transparent px-3 text-reading outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
        />
        {term && (
          <button
            type="button"
            aria-label={t('search.clear')}
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="h-10 shrink-0 rounded-button px-3 text-small text-muted hover:text-foreground"
          >
            {t('actions.clear')}
          </button>
        )}
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
        <button
          type="button"
          aria-label={t('actions.close')}
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-button text-muted hover:text-foreground"
        >
          <CloseIcon aria-hidden="true" className="size-5" />
        </button>
      </Form>

      {/* It scrolls with no scrollbar showing: the search is a box of cards, not a page. */}
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
        {searching ? (
          <PredictiveSearchResults
            answer={fetcher.data}
            loading={fetcher.state === 'loading'}
            onNavigate={onNavigate}
            bestSellers={start.data?.bestSellers}
          />
        ) : (
          <SearchStart start={start} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

/**
 * What the search opens with — the products the visitor viewed lately and the store's best sellers — in one call when
 * it opens, kept while the visitor types: a search that finds nothing offers the same best sellers (B-403).
 */
function useSearchStart() {
  const {ids, clear} = useProductList(RECENTLY_VIEWED);
  const fetcher = useFetcher<typeof searchStartLoader>();
  // The list as the search opened: "Clear" hides its products without a second call.
  const [opened] = useState(() => ids.slice(0, START_PRODUCTS).join(','));

  // `fetcher` is a new object on every render, but its `load` stays the same.
  const {load} = fetcher;
  useEffect(() => {
    void load(`/search-start?${new URLSearchParams({ids: opened})}`);
  }, [opened, load]);

  return {data: fetcher.data, ids, clear};
}

/**
 * Before the visitor types: the products they viewed lately (when there are any), which "Clear" forgets, and the
 * store's best sellers, one row each.
 */
function SearchStart({start, onNavigate}: {start: ReturnType<typeof useSearchStart>; onNavigate: () => void}) {
  const {t} = useTranslation();
  const {data, ids, clear} = start;
  const recent = (data?.recent ?? []).filter((product) => ids.includes(product.id));
  // While they load, the rows' places: as many recent cards as the browser keeps ids, and the best sellers (B-436).
  if (!data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        {ids.length > 0 && <RowPlaceholder title={t('product.recentlyViewed')} count={ids.length} />}
        <RowPlaceholder title={t('search.bestSellers')} count={START_PRODUCTS} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <ProductRow
        title={t('product.recentlyViewed')}
        products={recent}
        onNavigate={onNavigate}
        action={
          <button
            type="button"
            aria-label={t('search.clearRecent')}
            onClick={clear}
            className="text-small text-muted hover:text-foreground"
          >
            {t('actions.clear')}
          </button>
        }
      />
      <ProductRow title={t('search.bestSellers')} products={data?.bestSellers ?? []} onNavigate={onNavigate} />
    </div>
  );
}

/**
 * What the search found: a status read out as it changes, the categories and brands as chips, the products with
 * "View all" (with their count when the API knows it — Aura Search) over a fade, then the pages and articles. The
 * last answer stays until the next arrives.
 */
export function PredictiveSearchResults({
  answer,
  loading,
  onNavigate,
  bestSellers = [],
}: {
  /** The last answer of the search route, if any. */
  answer: PredictiveSearchReturn | undefined;
  loading: boolean;
  onNavigate: () => void;
  /** The store's best sellers, offered when the search finds nothing. */
  bestSellers?: SearchProductFragment[];
}) {
  const {t} = useTranslation();
  const result = answer ? answer.result : getEmptyPredictiveSearchResult();
  const answeredTerm = answer?.term ?? '';
  const {products, productsFound, collections, vendors, pages, articles} = result.items;

  // A failed search is not an empty one (B-425).
  const failed = Boolean(answer?.error && !loading);
  const nothing = Boolean(answer && !answer.error && !result.total && !loading);
  let status = '';
  if (loading) status = t('search.loading');
  else if (failed) status = t('search.error');
  else if (answer)
    status = result.total ? t('search.status', {count: result.total}) : t('search.empty', {term: answeredTerm});

  const chips = [
    ...collections.map((item) => ({id: item.id, title: item.title, to: collectionPath(item)})),
    ...vendors.map((item) => ({id: item.id, title: item.title, to: vendorPath(item.handle)})),
  ].slice(0, MAX_CHIPS);
  const links = [
    ...pages.map((item) => ({id: item.id, title: item.title, to: pagePath(item.handle)})),
    ...articles.map((item) => ({id: item.id, title: item.title, to: articlePath(item.handle)})),
  ];

  return (
    <div aria-busy={loading} className="flex flex-col gap-6">
      <p role="status" className={failed ? 'text-error' : nothing ? 'text-muted' : 'sr-only'}>
        {status}
      </p>
      {/* Nothing found: a hint, and the best sellers the search opened with as the way on (B-403); after a failure, the
          best sellers alone. */}
      {nothing && <p className="-mt-4 text-small text-muted">{t('search.emptyHint')}</p>}
      {(nothing || failed) && (
        <ProductRow title={t('search.bestSellers')} products={bestSellers} onNavigate={onNavigate} />
      )}

      {chips.length > 0 && (
        <ul aria-label={t('search.suggestions')} className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.id}>
              <KeptLink
                to={chip.to}
                onClick={onNavigate}
                className="inline-flex h-9 items-center rounded-full bg-surface px-4 text-small hover:bg-border hover:no-underline"
              >
                {chip.title}
              </KeptLink>
            </li>
          ))}
        </ul>
      )}

      {products.length > 0 && (
        <FadedProducts
          products={products}
          onNavigate={onNavigate}
          viewAll={
            <ButtonLink to={searchUrl(answeredTerm)} onClick={onNavigate} prefetch="intent">
              {productsFound == null ? t('search.viewAll') : t('search.viewAllCount', {count: productsFound})}
            </ButtonLink>
          }
        />
      )}

      {links.length > 0 && (
        <section>
          <h3 className="mb-3 font-medium">{t('search.pagesAndArticles')}</h3>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((link) => (
              <li key={link.id}>
                <KeptLink to={link.to} onClick={onNavigate} className="underline underline-offset-4">
                  {link.title}
                </KeptLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * The products found, as cards; when they run past what the search shows, their bottom fades and "View all" stands
 * over the fade, otherwise "View all" follows them.
 */
function FadedProducts({
  products,
  onNavigate,
  viewAll,
}: {
  products: Items['products'];
  onNavigate: () => void;
  viewAll: ReactNode;
}) {
  const {t} = useTranslation();
  const boxRef = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setCut(box.scrollHeight > box.clientHeight + 1));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <section>
      <h3 className="mb-3 font-medium">{t('search.products')}</h3>
      {/* With a card focused from the keyboard the box shows them all: a card under the fade or "View all" would take
          focus unseen (B-324). The observer then finds nothing cut, and the fade and the overlap go too. */}
      <div
        ref={boxRef}
        className={`max-h-search-results overflow-hidden has-focus-visible:max-h-none ${cut ? 'fade-bottom' : ''}`}
      >
        <ProductGrid products={products} onNavigate={onNavigate} />
      </div>
      <div className={`flex justify-center ${cut ? 'relative -mt-16' : 'mt-6'}`}>{viewAll}</div>
    </section>
  );
}

/** A row's place while its products load: its title and up to `START_PRODUCTS` cards' places. */
function RowPlaceholder({title, count}: {title: string; count: number}) {
  return (
    <section>
      <h3 className="mb-3 font-medium">{title}</h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
        {Array.from({length: Math.min(count, START_PRODUCTS)}, (_, slot) => (
          <li key={slot}>
            <SearchProductCardPlaceholder />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A titled row of products, with an action beside the title; nothing without products. */
function ProductRow({
  title,
  products,
  onNavigate,
  action,
}: {
  title: string;
  products: SearchProductFragment[];
  onNavigate: () => void;
  action?: ReactNode;
}) {
  if (!products.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{title}</h3>
        {action}
      </div>
      <ProductGrid products={products.slice(0, START_PRODUCTS)} onNavigate={onNavigate} />
    </section>
  );
}

/** The search's cards: two to a row on a phone, four from the main breakpoint. */
function ProductGrid({products, onNavigate}: {products: SearchProductFragment[]; onNavigate: () => void}) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <SearchProductCard product={product} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}
