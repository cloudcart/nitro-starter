import {type MouseEvent, useMemo, useSyncExternalStore} from 'react';
import {historyIndex, keepListingPicture} from '~/lib/page-swipe';

/** The tab's memory of the listing a product was opened from: its products in the order shown. */
const KEY = 'nitrogen:listing';

const PRODUCT_PATH = /^\/product\/[^/]+$/;

/** A product of a listing as its card showed it: enough to show its page coming before it loads. */
export interface ListedProduct {
  path: string;
  /** The card's title. */
  title?: string;
  /** The address of the card's first picture as the browser loaded it; none for a product without one. */
  picture?: string;
}

/** The listing itself: where a swipe back from the product opened from it returns. */
export interface Listing {
  /** Its address, with its filters and order. */
  path: string;
  /** Its place in the tab's history: a swipe back steps back to it there, at its scroll. */
  index?: number;
}

const pathOf = (link: Element) => new URL(link.getAttribute('href') ?? '', window.location.href).pathname;

/**
 * Remembers a listing when the visitor opens one of its products — the listing's `onClickCapture`: each card's path,
 * title and picture, the product opened and the listing's own address, in this tab's session storage, and how the
 * page looked (`keepListingPicture`). The product page then shows the next or previous product coming in as the
 * visitor swipes to it, and, from the product opened, the listing itself.
 */
export function rememberListing(event: MouseEvent<HTMLElement>) {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link || !PRODUCT_PATH.test(pathOf(link))) return;
  const products = new Map<string, ListedProduct>();
  for (const card of event.currentTarget.querySelectorAll('a[href]')) {
    const path = pathOf(card);
    if (!PRODUCT_PATH.test(path)) continue;
    const product = products.get(path) ?? {path};
    const picture = card.querySelector('img');
    product.picture ??= picture ? picture.currentSrc || picture.src || undefined : undefined;
    product.title ??= card.querySelector('h3')?.textContent?.trim() || undefined;
    products.set(path, product);
  }
  const listing: Listing = {path: window.location.pathname + window.location.search, index: historyIndex()};
  const main = event.currentTarget.closest('main');
  if (main) keepListingPicture(listing.path, main);
  try {
    sessionStorage.setItem(KEY, JSON.stringify({products: [...products.values()], opened: pathOf(link), listing}));
  } catch {
    // Storage blocked: the product page simply has no neighbours to swipe to.
  }
}

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** A path as its letters, for comparing an encoded one with one that is not. */
function decoded(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** A stored entry, if it is one this code wrote. */
function listed(entry: unknown): ListedProduct | null {
  if (typeof entry !== 'object' || entry === null || typeof (entry as ListedProduct).path !== 'string') return null;
  const {path, title, picture} = entry as ListedProduct;
  return {
    path,
    title: typeof title === 'string' ? title : undefined,
    picture: typeof picture === 'string' ? picture : undefined,
  };
}

/** The list changes only on a listing's page, never while a product page reads it. */
const unchanging = () => () => {};

/** What lies on either side of a product page: the listing's products, and before the product opened, the listing. */
export interface Neighbours {
  previous?: ListedProduct;
  next?: ListedProduct;
  /** On the product opened from the listing: the listing, in place of the product before it (B-355). */
  listing?: Listing;
}

/** The products before and after `path` in the listing it was opened from; none when it was not opened from one. */
export function useListingNeighbours(path: string): Neighbours {
  const stored = useSyncExternalStore(unchanging, read, () => null);
  // The same objects while the list and the path stay: an effect can depend on them.
  return useMemo(() => neighboursIn(stored, path), [stored, path]);
}

function neighboursIn(stored: string | null, path: string): Neighbours {
  let memory: unknown = null;
  try {
    memory = stored ? JSON.parse(stored) : null;
  } catch {
    // A list this code did not write: no neighbours.
  }
  const {
    products: entries,
    opened,
    listing,
  } = (memory ?? {}) as {products?: unknown; opened?: unknown; listing?: unknown};
  if (!Array.isArray(entries)) return {};
  const products = entries.map(listed);
  // A link's path is percent-encoded where a handle has letters outside ASCII; `path` may not be.
  const index = products.findIndex((product) => product && decoded(product.path) === decoded(path));
  if (index < 0) return {};
  const next = products[index + 1] ?? undefined;
  const back = listing as Listing | undefined;
  if (typeof opened === 'string' && decoded(opened) === decoded(path) && typeof back?.path === 'string') {
    return {next, listing: {path: back.path, index: typeof back.index === 'number' ? back.index : undefined}};
  }
  return {previous: products[index - 1] ?? undefined, next};
}
