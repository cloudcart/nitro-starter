import {useId, useSyncExternalStore} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {hiddenPairs, pairId, setParam, SORT_OPTIONS, type SortLabel} from '~/lib/filters';
import {useRefinementNavigation} from '~/lib/listing-history';
import {Button} from '~/components/ui/Button';
import {TextSelect} from '~/components/ui/Field';
import {ColumnsIcon, SortIcon} from '~/components/ui/icons';

/** How many products a row of the listing holds: `roomy` shows them larger, `dense` fits more. */
export type Density = 'roomy' | 'dense';

/**
 * A listing's columns for each density, on a phone, from 750 px and from 990 px, where the filters' column takes
 * the side (Q-38).
 */
const COLUMNS: Record<Density, [number, number, number]> = {roomy: [1, 2, 2], dense: [2, 3, 3]};

/** A listing's columns: from 990 px the filters at the side, the products beside them. */
export const LISTING_COLUMNS = 'lg:grid lg:grid-cols-[var(--container-filters)_minmax(0,1fr)] lg:gap-10';

/**
 * The listing's toolbar row. Below 990 px it stays at the screen's top, under the header while it shows and in its
 * place when it slides away (`header-hidden:`), edge to edge on the page's background. From 990 px it is as high as the
 * filters' heading row beside it (`h-11`, its padding and line in it), its controls on the same middle and its line on
 * that row's line (T-543).
 */
export const LISTING_TOOLBAR =
  '-mx-gutter flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-background px-gutter py-3 lg:h-11 max-lg:sticky max-lg:top-16 max-lg:z-30 max-lg:transition-[top] max-lg:duration-300 max-lg:ease-out max-lg:header-hidden:top-0 md:-mx-gutter-md md:px-gutter-md lg:mx-0 lg:px-0 lg:pt-0';

export const LISTING_GRID_CLASSES: Record<Density, string> = {
  roomy: 'grid-cols-1 md:grid-cols-2',
  dense: 'grid-cols-2 md:grid-cols-3',
};

/** The cards of a listing's first row, at its widest: their pictures are fetched first (`ProductItem`'s `priority`). */
export const LISTING_FIRST_ROW: Record<Density, number> = {
  roomy: Math.max(...COLUMNS.roomy),
  dense: Math.max(...COLUMNS.dense),
};

/**
 * A listing card's picture width for each density, for the browser to pick its size (B-320): the columns above, in
 * the page's width (`--container-page`, 90rem) less its gutters (`--spacing-gutter` 1.25rem, `-md` 2.5rem), and from
 * 990 px less the filters' column (`--container-filters` 17rem) and its gap (2.5rem); the cards' gap is 1rem.
 */
export const LISTING_CARD_SIZES: Record<Density, string> = {
  roomy:
    '(min-width: 1440px) 516px, (min-width: 990px) calc(50vw - 204px), (min-width: 750px) calc(50vw - 48px), 100vw',
  dense:
    '(min-width: 1440px) 339px, (min-width: 990px) calc(33.33vw - 141px), (min-width: 750px) calc(33.33vw - 37px), calc(50vw - 28px)',
};

/**
 * The number of products, for screen readers: read out when filters change it. The toolbar keeps no room for it on the
 * screen (the user, 2026-10-15); the filter drawer's button shows it.
 */
export function ListingCount({count}: {count: number}) {
  const {t} = useTranslation();
  return (
    <p aria-live="polite" className="sr-only">
      {t('listing.count', {count})}
    </p>
  );
}

/**
 * The sort order as its text and an arrow, kept in the `sort` URL parameter; on a phone an icon, with a dot while the
 * order is not the store's own (T-566). `defaultSort` names the store's own order.
 */
export function SortSelect({defaultSort = 'featured'}: {defaultSort?: SortLabel}) {
  const {t} = useTranslation();
  const id = useId();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refinement = useRefinementNavigation();
  const sort = searchParams.get('sort') ?? '';

  // A GET form: without JavaScript the order applies by its button, keeping the filters (T-600).
  return (
    <form method="get" className="flex items-center gap-2">
      {hiddenPairs(searchParams, {keys: ['sort']}).map(([key, value]) => (
        <input key={pairId(key, value)} type="hidden" name={key} value={value} />
      ))}
      <label htmlFor={id} className="sr-only text-small text-muted md:not-sr-only">
        {t('listing.sortBy')}
      </label>
      <TextSelect
        id={id}
        name="sort"
        value={sort}
        phoneIcon={
          <>
            <SortIcon className="size-5" />
            {sort && <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-accent" />}
          </>
        }
        options={SORT_OPTIONS.map((option) => ({
          value: option.value,
          label: t(`listing.sort.${option.value ? option.label : defaultSort}`),
        }))}
        onChange={(event) =>
          void navigate(`?${setParam(searchParams, 'sort', event.target.value || null)}`, {
            preventScrollReset: true,
            ...refinement,
          })
        }
      />
      <noscript>
        <Button type="submit" variant="secondary">
          {t('filters.apply')}
        </Button>
      </noscript>
    </form>
  );
}

/** Two buttons: larger products, or more of them in a row; each draws the columns it gives at the current width. */
export function DensityToggle({value, onChange}: {value: Density; onChange: (density: Density) => void}) {
  const {t} = useTranslation();

  return (
    <div role="group" aria-label={t('listing.density')} className="flex items-center">
      {(['roomy', 'dense'] as const).map((density) => {
        const [phone, tablet, desktop] = COLUMNS[density];
        return (
          <button
            key={density}
            type="button"
            aria-pressed={value === density}
            aria-label={t(density === 'roomy' ? 'listing.fewer' : 'listing.more')}
            onClick={() => onChange(density)}
            className="grid size-11 place-items-center text-muted hover:text-foreground aria-pressed:text-foreground"
          >
            <ColumnsIcon count={phone} className="size-5 md:hidden" />
            <ColumnsIcon count={tablet} className="hidden size-5 md:block lg:hidden" />
            <ColumnsIcon count={desktop} className="hidden size-5 lg:block" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The visitor's density, kept in this browser. The server, and the first render in the browser, show `dense`.
 * Where the browser keeps nothing (storage blocked), the choice lasts until the page is left.
 */
export function useListingDensity(): [Density, (density: Density) => void] {
  const density = useSyncExternalStore(subscribe, readDensity, () => 'dense' as const);
  return [density, writeDensity];
}

const STORAGE_KEY = 'listing-density';
let current: Density | null = null;
const listeners = new Set<() => void>();

function readDensity(): Density {
  if (current === null) {
    try {
      current = localStorage.getItem(STORAGE_KEY) === 'roomy' ? 'roomy' : 'dense';
    } catch {
      // Storage blocked: the default.
      current = 'dense';
    }
  }
  return current;
}

function writeDensity(density: Density) {
  current = density;
  try {
    localStorage.setItem(STORAGE_KEY, density);
  } catch {
    // Storage blocked: the choice holds for this page only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // Another tab's choice applies here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
