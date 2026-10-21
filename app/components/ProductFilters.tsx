import {type ReactNode, type RefObject, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {
  Link,
  type LinkProps,
  useLocation,
  useNavigate,
  useNavigation,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {Image, moneyWithFormat} from '@cloudcart/nitrogen-react';
import type {CurrencyCode} from '@cloudcart/nitrogen/storefront-api-types';
import type {ListingFilterFragment} from 'storefrontapi.generated';
import {
  clearFilterParams,
  filterInputToParam,
  hasFilterParams,
  hiddenPairs,
  isFilterActive,
  paramPosition,
  pairId,
  setParam,
  toggleFilterParam,
} from '~/lib/filters';
import {useAside} from '~/components/Aside';
import {AccordionItem} from '~/components/ui/Accordion';
import {Button} from '~/components/ui/Button';
import {AffixInput, Checkbox} from '~/components/ui/Field';
import {Dropdown} from '~/components/ui/Dropdown';
import {CloseIcon, FilterIcon, MoreIcon} from '~/components/ui/icons';
import {CountBadge} from '~/components/ui/Badge';
import type {RootLoader} from '~/root';
import {useRefinementNavigation} from '~/lib/listing-history';

/*
 * The listing's facets, as the API returns them for the products shown, without counts. Choosing a value adds it
 * to the URL, and the page loads the products again with it: from 990 px in a column beside the products, below in
 * a drawer; the same list in both (Q-38).
 */

type Filter = ListingFilterFragment;

/** The frame of the button that opens the filters' drawer below 990 px, round its name or its icon alone. */
const PILL_FRAME = 'inline-flex min-h-11 items-center rounded-button border border-border hover:border-foreground';
const FILTER_PILL = `${PILL_FRAME} gap-2 px-4 text-small whitespace-nowrap`;

/** How many values a facet shows before "Show all". */
const VISIBLE_VALUES = 8;

/** How long the price waits after the last key before it applies: a price is typed in several digits (T-600). */
const PRICE_TYPING_DELAY_MS = 500;

/** The facets the listing offers, in the merchant's order. Property ranges cannot be applied through the API yet. */
export function usableFilters(filters: Filter[]) {
  return filters.filter((filter) => filter.type !== 'RANGE').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/** How many filters are on: each facet's values. */
export function activeFilterCount(filters: Filter[], searchParams: URLSearchParams) {
  return filters.reduce((sum, filter) => sum + activeValues(filter, searchParams), 0);
}

/**
 * The filters, in the merchant's order: each yes-or-no facet as a checkbox; each other facet opening
 * its values in place, with an animation, and staying open until the visitor closes it — open already when one of
 * its values is chosen, and the first `openFirst` open from the start.
 */
function FilterList({filters, openFirst = 0}: {filters: Filter[]; openFirst?: number}) {
  const {t} = useTranslation();
  const {searchParams, go} = useFilterUrl();
  const priced = filters.some((filter) => filter.type === 'PRICE_RANGE');
  // The facets open from the start.
  const openIds = new Set(
    filters
      .filter((filter) => filter.type !== 'BOOLEAN')
      .slice(0, openFirst)
      .map((filter) => filter.id),
  );

  // With JavaScript a value applies as it changes, and a submission is the price's (Enter, its button, a pause in
  // typing); without, the form is the listing's address (T-600).
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = withPrice(searchParams, new FormData(event.currentTarget));
    if (next) go(next);
  }

  return (
    <form method="get" onSubmit={submit}>
      {hiddenPairs(searchParams, {keys: priced ? ['minPrice', 'maxPrice'] : [], pairs: carriedPairs(filters)}).map(
        ([key, value]) => (
          <input key={pairId(key, value)} type="hidden" name={key} value={value} />
        ),
      )}
      {filters.map((filter) => {
        if (filter.type === 'BOOLEAN') {
          const yes = yesValue(filter);
          return yes ? (
            <CheckRow
              key={filter.id}
              label={filter.label}
              field={fieldOf(yes.input)}
              checked={isFilterActive(searchParams, yes.input)}
              onChange={() => go(toggleFilterParam(searchParams, yes.input))}
            />
          ) : null;
        }
        const count = activeValues(filter, searchParams);
        return (
          <AccordionItem
            key={filter.id}
            defaultOpen={count > 0 || openIds.has(filter.id)}
            title={
              <span className="flex items-center gap-2">
                {filter.label}
                <SelectedCount count={count} />
              </span>
            }
          >
            <FilterValues filter={filter} />
          </AccordionItem>
        );
      })}
      <noscript>
        <Button type="submit" className="mt-4">
          {t('filters.apply')}
        </Button>
      </noscript>
    </form>
  );
}

/** A facet value's field in the filters' form: its address parameter's name and value (`filterInputToParam`). */
function fieldOf(input: string) {
  const param = filterInputToParam(input);
  return param ? {name: param.key, value: param.value} : {};
}

/** The address pairs the filters' form names with fields of its own: a facet's values, a yes-or-no facet's "yes". */
function carriedPairs(filters: Filter[]) {
  const values = filters.flatMap((filter) =>
    filter.type === 'PRICE_RANGE' ? [] : filter.type === 'BOOLEAN' ? [yesValue(filter)] : filter.values,
  );
  const pairs = new Set<string>();
  for (const value of values) {
    const param = value && filterInputToParam(value.input);
    if (param) pairs.add(pairId(param.key, param.value));
  }
  return pairs;
}

/** The address with the form's price bounds, both in one navigation; null when the address has them already. */
function withPrice(searchParams: URLSearchParams, form: FormData) {
  const bound = (key: string) => String(form.get(key) ?? '').trim() || null;
  const [min, max] = [bound('minPrice'), bound('maxPrice')];
  if (min === searchParams.get('minPrice') && max === searchParams.get('maxPrice')) return null;
  return setParam(setParam(searchParams, 'minPrice', min), 'maxPrice', max);
}

/**
 * From 990 px, the column beside the products: the filters' heading, "Clear all" while any is on, then the filters,
 * the first four facets open.
 */
export function FilterSidebar({filters, className = ''}: {filters: Filter[]; className?: string}) {
  const {t} = useTranslation();
  const searchParams = useFilterParams();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={className}>
      {/* As high as the products' toolbar beside it (`h-11` with its padding and line): one line across (T-543). */}
      <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border pb-3">
        <h2 id={headingId} className="text-subheading">
          {t('filters.title')}
        </h2>
        {hasFilterParams(searchParams) && (
          <RefineLink to={`?${clearFilterParams(searchParams)}`} className="text-small underline underline-offset-4">
            {t('filters.clearAll')}
          </RefineLink>
        )}
      </div>
      <FilterList filters={filters} openFirst={4} />
    </section>
  );
}

/** Below 990 px, in the filters drawer: the filters, then "Clear all" and the way back to the products. */
export function FilterPanel({filters, totalCount}: {filters: Filter[]; totalCount?: number | null}) {
  const {t} = useTranslation();
  const {close} = useAside();
  const searchParams = useFilterParams();

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <FilterList filters={filters} />
      </div>
      <div className="flex shrink-0 items-center gap-4 border-t border-border p-5">
        {hasFilterParams(searchParams) && (
          <RefineLink to={`?${clearFilterParams(searchParams)}`} className="text-small underline underline-offset-4">
            {t('filters.clearAll')}
          </RefineLink>
        )}
        <Button onClick={close} className="flex-1">
          {totalCount != null ? t('filters.viewCount', {count: totalCount}) : t('filters.viewProducts')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The chosen filters as chips on one line, newest first (T-558), each removing itself: the ones that fit, and when some
 * do not, "⋯", a menu of those out of sight — only those, the oldest (B-384) — that removes them too and stays open
 * while it does (T-554, T-555); "Clear all" always. Nothing when none is chosen. Until it has measured — the server's
 * HTML — the chips wrap in a one-line box that hides the ones that do not fit.
 */
export function ActiveFilters({filters, className = ''}: {filters: Filter[]; className?: string}) {
  const {t} = useTranslation();
  const searchParams = useFilterParams();

  // Each chip with where its filter stands in the address, the order the filters were chosen in (T-558).
  const chips: Array<{label: string; params: URLSearchParams; position: number}> = [];
  for (const filter of filters) {
    for (const value of filter.values) {
      const param = filterInputToParam(value.input);
      if (!param || !isFilterActive(searchParams, value.input)) continue;
      chips.push({
        label: filter.type === 'BOOLEAN' ? filter.label : t('filters.chip', {name: filter.label, value: value.label}),
        params: toggleFilterParam(searchParams, value.input),
        position: paramPosition(searchParams, param.key, param.value),
      });
    }
  }
  const min = searchParams.get('minPrice');
  const max = searchParams.get('maxPrice');
  const root = useRouteLoaderData<RootLoader>('root');
  if (min || max) {
    const facet = filters.find((filter) => filter.type === 'PRICE_RANGE');
    const name = facet?.label || t('filters.price');
    // Each bound as the store writes money, in the facet's currency (the store's when the facet is gone) (T-556).
    // Typed a plain string by the generated types; it is the API's currency code.
    const currency = (facet?.minValue?.currencyCode ?? root?.header.localization.country.currency.isoCode) as
      CurrencyCode | undefined;
    const format = root?.header.shop.currencyFormat;
    const priced = (amount: string) =>
      currency && format ? (moneyWithFormat(amount, currency, format).formatted ?? amount) : amount;
    const value =
      min && max
        ? t('filters.priceRange', {min: priced(min), max: priced(max)})
        : min
          ? t('filters.priceFrom', {min: priced(min)})
          : t('filters.priceTo', {max: priced(max ?? '')});
    chips.push({
      label: t('filters.chip', {name, value}),
      params: setParam(setParam(searchParams, 'minPrice', null), 'maxPrice', null),
      position: Math.max(paramPosition(searchParams, 'minPrice'), paramPosition(searchParams, 'maxPrice')),
    });
  }
  // The newest first: the last chosen stay in the row and push the older ones on into "⋯" (T-558).
  chips.sort((a, b) => b.position - a.position);

  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);
  const shown = useFittingCount(rowRef, measureRef, chips.map((chip) => chip.label).join('\n'));
  if (!hasFilterParams(searchParams)) return null;

  const visible = shown === null ? chips : chips.slice(0, shown);
  const hidden = shown === null ? [] : chips.slice(shown);
  const clearAll = (
    <RefineLink
      to={`?${clearFilterParams(searchParams)}`}
      className="shrink-0 px-2 text-small whitespace-nowrap underline underline-offset-4"
    >
      {t('filters.clearAll')}
    </RefineLink>
  );

  return (
    <div ref={rowRef} className={`relative flex min-w-0 items-center gap-2 ${className}`}>
      <ul
        aria-label={t('filters.chosen')}
        className={`flex min-w-0 items-center gap-2 ${shown === null ? 'h-6.5 flex-wrap overflow-hidden' : ''}`}
      >
        {visible.map((chip) => (
          <li key={chip.label} className="shrink-0">
            <FilterChip label={chip.label} params={chip.params} />
          </li>
        ))}
      </ul>
      {hidden.length > 0 && (
        <Dropdown
          label={t('filters.more', {count: hidden.length})}
          icon={<MoreIcon className="size-5" />}
          className="shrink-0"
          buttonClassName={CHIP_SIZE}
        >
          <ul aria-label={t('filters.more', {count: hidden.length})} className="flex flex-col">
            {hidden.map((chip) => (
              <li key={chip.label}>
                <RefineLink
                  to={`?${chip.params}`}
                  aria-label={t('filters.remove', {label: chip.label})}
                  className="flex min-h-11 items-center justify-between gap-4 rounded-button px-3 text-small hover:bg-surface"
                >
                  {chip.label}
                  <CloseIcon className="size-4 shrink-0" />
                </RefineLink>
              </li>
            ))}
          </ul>
        </Dropdown>
      )}
      {clearAll}
      {/* What every part would take, measured out of sight: "⋯", "Clear all", then each chip. */}
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none invisible absolute top-0 left-0 h-0 w-0 overflow-hidden"
      >
        <ul ref={measureRef} className="flex w-max items-center gap-2">
          <li className={CHIP_SIZE} />
          <li>{clearAll}</li>
          {chips.map((chip) => (
            <li key={chip.label}>
              <FilterChip label={chip.label} params={chip.params} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * The button that opens the filters' drawer below 990 px: a pill with its icon, its name and the count of the values
 * chosen. Where the toolbar's line has no room for the name (`named` false: the user, 2026-10-19, T-566), the icon
 * alone, the count a badge on its corner; the name stays for screen readers. A copy of the whole pill lies out of
 * sight (`copyRef`), for the toolbar to measure (`useFitsBeside`), so the name comes back once there is room again.
 */
export function FiltersButton({
  chosen,
  named,
  copyRef,
  className = '',
}: {
  chosen: number;
  named: boolean;
  copyRef: RefObject<HTMLSpanElement | null>;
  className?: string;
}) {
  const {t} = useTranslation();
  const {open} = useAside();

  return (
    <>
      <button
        type="button"
        onClick={() => open('filters')}
        className={`${named ? FILTER_PILL : `${PILL_FRAME} relative w-11 justify-center`} ${className}`}
      >
        <FilterIcon className="size-4" />
        <span className={named ? undefined : 'sr-only'}>{t('filters.title')}</span>
        {chosen > 0 && (
          <>
            {named ? (
              <span aria-hidden="true" className="text-muted">
                ({chosen})
              </span>
            ) : (
              <span aria-hidden="true" className="absolute -top-2 -right-2">
                <CountBadge>{chosen}</CountBadge>
              </span>
            )}
            <span className="sr-only">{t('filters.selected', {count: chosen})}</span>
          </>
        )}
      </button>
      <span
        aria-hidden="true"
        className={`pointer-events-none invisible absolute top-0 left-0 h-0 w-0 overflow-hidden ${className}`}
      >
        <span ref={copyRef} className={`${FILTER_PILL} w-max`}>
          <FilterIcon className="size-4" />
          {t('filters.title')}
          {chosen > 0 && <span className="text-muted">({chosen})</span>}
        </span>
      </span>
    </>
  );
}

/**
 * Whether `copyRef`'s element, at its whole width, fits on `rowRef`'s line beside `restRef`'s: the row's width inside
 * its padding, less the other's width and the row's gap. Again as any of them changes size (the screen turned, a font
 * that loads, a count that grew). The server, and the first render, say it does. Called by the component that renders
 * the row: a child's layout effect runs before its parent's refs are set.
 */
export function useFitsBeside(
  rowRef: RefObject<HTMLElement | null>,
  copyRef: RefObject<HTMLElement | null>,
  restRef: RefObject<HTMLElement | null>,
): boolean {
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const copy = copyRef.current;
    const rest = restRef.current;
    if (!row || !copy || !rest) return;

    const fit = () => {
      const style = getComputedStyle(row);
      const room = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = parseFloat(style.columnGap) || 0;
      setFits(copy.getBoundingClientRect().width + gap + rest.getBoundingClientRect().width <= room);
    };

    fit();
    const observer = new ResizeObserver(fit);
    for (const element of [row, copy, rest]) observer.observe(element);
    return () => observer.disconnect();
  }, [rowRef, copyRef, restRef]);

  return fits;
}

/** The chips' height, and the square of "⋯" beside them: 26 px (T-555). */
const CHIP_SIZE = 'size-6.5';

/** A chosen filter as a chip that removes it, 26 px high (T-555). */
function FilterChip({label, params}: {label: string; params: URLSearchParams}) {
  const {t} = useTranslation();
  return (
    <RefineLink
      to={`?${params}`}
      aria-label={t('filters.remove', {label})}
      className="inline-flex h-6.5 items-center gap-1.5 rounded-button bg-surface px-3 text-small whitespace-nowrap hover:bg-border"
    >
      {label}
      <CloseIcon className="size-4" />
    </RefineLink>
  );
}

/**
 * How many of the chips fit the row on one line beside "Clear all" — and "⋯" when some do not — from the out-of-sight
 * copy (`measureRef`: "⋯", "Clear all", then the chips); again as the row's width or the copy's change (a font that
 * loads). Null until measured.
 */
function useFittingCount(
  rowRef: RefObject<HTMLElement | null>,
  measureRef: RefObject<HTMLElement | null>,
  chips: string,
): number | null {
  const [count, setCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;

    const fit = () => {
      const [more = 0, clear = 0, ...widths] = Array.from(
        measure.children,
        (child) => child.getBoundingClientRect().width,
      );
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const room = row.clientWidth;
      // All of them, then "Clear all".
      if (widths.reduce((sum, width) => sum + width + gap, clear) <= room) {
        setCount(widths.length);
        return;
      }
      // As many as fit before "⋯" and "Clear all".
      let used = more + gap + clear;
      let fitting = 0;
      while (fitting < widths.length && used + widths[fitting]! + gap <= room) {
        used += widths[fitting]! + gap;
        fitting++;
      }
      setCount(fitting);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [rowRef, measureRef, chips]);

  return count;
}

/**
 * The filters as the visitor last set them: while the listing they asked for loads, the address it is on its way to —
 * so a box ticks at the click, not with the answer, and a second click adds to the first instead of undoing it
 * (B-238). Otherwise the page's own.
 */
function useFilterParams() {
  const [current] = useSearchParams();
  const {pathname} = useLocation();
  const next = useNavigation().location;
  return next && next.pathname === pathname ? new URLSearchParams(next.search) : current;
}

/**
 * The filters (`useFilterParams`), and a way to change them that keeps the page where it is — one history entry for
 * them all (`useRefinementNavigation`).
 */
function useFilterUrl() {
  const searchParams = useFilterParams();
  const navigate = useNavigate();
  const refinement = useRefinementNavigation();
  const go = (params: URLSearchParams) => void navigate(`?${params}`, {preventScrollReset: true, ...refinement});
  return {searchParams, go};
}

/** A link that changes the listing's filters, keeping the page where it is: one history entry for them all. */
function RefineLink(props: Omit<LinkProps, 'replace' | 'state' | 'preventScrollReset'>) {
  const refinement = useRefinementNavigation();
  return <Link {...props} preventScrollReset {...refinement} />;
}

/** A yes-or-no facet's "yes" value: {"onSale": true} and the like. */
function yesValue(filter: Filter) {
  return filter.values.find((value) => filterInputToParam(value.input)?.value === 'true');
}

function activeValues(filter: Filter, searchParams: URLSearchParams) {
  if (filter.type === 'PRICE_RANGE') return searchParams.get('minPrice') || searchParams.get('maxPrice') ? 1 : 0;
  return filter.values.filter((value) => isFilterActive(searchParams, value.input)).length;
}

/** The number of a facet's values chosen, read out as "2 selected". */
function SelectedCount({count}: {count: number}) {
  const {t} = useTranslation();
  if (count === 0) return null;
  return (
    <CountBadge>
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{t('filters.selected', {count})}</span>
    </CountBadge>
  );
}

/**
 * A facet's values: a price range, swatches, or a list of checkboxes — a group named by the facet, so a value reads as
 * "Colour: Red", not "Red" alone (B-434).
 */
function FilterValues({filter}: {filter: Filter}) {
  return (
    <div role="group" aria-label={filter.label}>
      {filter.type === 'PRICE_RANGE' ? (
        <PriceRange filter={filter} />
      ) : filter.type === 'SWATCH_COLOR' || filter.type === 'SWATCH_IMAGE' ? (
        <Swatches filter={filter} />
      ) : (
        <ListValues filter={filter} />
      )}
    </div>
  );
}

function ListValues({filter}: {filter: Filter}) {
  const {t} = useTranslation();
  const {searchParams, go} = useFilterUrl();
  const [expanded, setExpanded] = useState(false);
  const values = expanded ? filter.values : filter.values.slice(0, VISIBLE_VALUES);

  return (
    <div className="flex flex-col">
      {values.map((value) => (
        <label key={value.id} className="flex min-h-9 cursor-pointer items-center gap-3 text-body">
          <Checkbox
            {...fieldOf(value.input)}
            checked={isFilterActive(searchParams, value.input)}
            onChange={() => go(toggleFilterParam(searchParams, value.input))}
          />
          <span className="flex-1 truncate">{value.label}</span>
        </label>
      ))}
      {/* A chosen value out of sight goes with the form all the same. */}
      {!expanded &&
        filter.values
          .slice(VISIBLE_VALUES)
          .filter((value) => isFilterActive(searchParams, value.input))
          .map((value) => <input key={value.id} type="hidden" {...fieldOf(value.input)} />)}
      {filter.values.length > VISIBLE_VALUES && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-2 self-start text-small underline underline-offset-4"
        >
          {expanded ? t('filters.showLess') : t('filters.showAll', {count: filter.values.length})}
        </button>
      )}
    </div>
  );
}

function Swatches({filter}: {filter: Filter}) {
  const {searchParams, go} = useFilterUrl();

  return (
    <div className="flex max-w-64 flex-wrap gap-2">
      {filter.values.map((value) => (
        // A box under the swatch, so the form carries it without JavaScript (T-600).
        <label
          key={value.id}
          title={value.label}
          className="relative size-10 cursor-pointer overflow-hidden rounded-full border-2 border-control p-0.5 hover:border-muted has-checked:border-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
        >
          <input
            type="checkbox"
            {...fieldOf(value.input)}
            aria-label={value.label}
            checked={isFilterActive(searchParams, value.input)}
            onChange={() => go(toggleFilterParam(searchParams, value.input))}
            className="sr-only"
          />
          {value.swatchImage ? (
            <Image
              src={value.swatchImage}
              alt=""
              width={32}
              aspectRatio="1/1"
              className="size-full rounded-full object-cover"
            />
          ) : (
            // The merchant's colour for the value.
            <span
              className="block size-full rounded-full"
              style={{backgroundColor: value.swatchColor ?? 'var(--color-border)'}}
            />
          )}
        </label>
      ))}
    </div>
  );
}

/**
 * The price facet: the least and the most price, each field with the currency in it, the two sharing the column's
 * width.
 */
function PriceRange({filter}: {filter: Filter}) {
  const {t} = useTranslation();
  const {searchParams} = useFilterUrl();
  const min = searchParams.get('minPrice') ?? '';
  const max = searchParams.get('maxPrice') ?? '';
  // Typed a plain string by the generated types; it is the API's currency code.
  const currency = filter.minValue?.currencyCode as CurrencyCode | undefined;
  // In the store's currency, as the store writes its money (`Shop.currencyFormat`, B-435): its symbol on the side the
  // store puts it, the hints with its decimals and separators. Another currency, or a symbol the store does not write:
  // its code after the number, the hints as the API gives them.
  const header = useRouteLoaderData<RootLoader>('root')?.header;
  const format =
    currency && header?.localization.country.currency.isoCode === currency ? header.shop.currencyFormat : null;
  const symbol =
    format && format.symbolPosition !== 'NONE'
      ? {text: format.symbol, before: format.symbolPosition === 'BEFORE'}
      : null;
  const hint = (value: number | null | undefined) =>
    value == null
      ? ''
      : format && currency
        ? (moneyWithFormat(value, currency, {...format, symbolPosition: 'NONE'}).formatted ?? String(value))
        : String(value);

  // A pause in typing submits the filters' form, which applies the price (`withPrice`), as Enter and the button do.
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const applyAfterTyping = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(timerRef.current);
    const form = event.currentTarget.form;
    timerRef.current = setTimeout(() => form?.requestSubmit(), PRICE_TYPING_DELAY_MS);
  };

  return (
    <div key={`${min}-${max}`} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <PriceField
          name="minPrice"
          defaultValue={min}
          placeholder={hint(filter.minValue?.value ?? 0)}
          label={t('filters.minPrice')}
          currency={currency}
          symbol={symbol}
          onChange={applyAfterTyping}
        />
        <span aria-hidden="true" className="text-muted">
          –
        </span>
        <PriceField
          name="maxPrice"
          defaultValue={max}
          placeholder={hint(filter.maxValue?.value)}
          label={t('filters.maxPrice')}
          currency={currency}
          symbol={symbol}
          onChange={applyAfterTyping}
        />
      </div>
      <Button type="submit" variant="secondary" className="self-start">
        {t('filters.apply')}
      </Button>
    </div>
  );
}

/**
 * One bound of the price range: a number field that takes its share of the row, with the currency inside it — its
 * symbol on its side, or else its code after the number — which describes the field.
 */
function PriceField({
  name,
  defaultValue,
  placeholder,
  label,
  currency,
  symbol,
  onChange,
}: {
  name: string;
  defaultValue: string;
  placeholder: string;
  label: string;
  currency?: string | null;
  symbol?: {text: string; before: boolean} | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const currencyId = useId();
  const mark = currency ? (
    <span id={currencyId} className={symbol ? 'text-muted' : 'text-small text-muted'}>
      {symbol?.text ?? currency}
    </span>
  ) : null;
  return (
    <AffixInput
      name={name}
      type="number"
      inputMode="decimal"
      step="any"
      min={0}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={label}
      aria-describedby={mark ? currencyId : undefined}
      leading={symbol?.before ? mark : null}
      trailing={symbol?.before ? null : mark}
      className="min-w-0 flex-1"
    />
  );
}

function CheckRow({
  label,
  field,
  checked,
  onChange,
}: {
  label: ReactNode;
  /** The box's name and value in a form. */
  field?: {name?: string; value?: string};
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border py-3 font-medium">
      <Checkbox {...field} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="flex-1">{label}</span>
    </label>
  );
}
