import {useCallback, useMemo, useSyncExternalStore} from 'react';
import {PRODUCT_LIST_EVENT, RECENTLY_VIEWED_KEY, VISITOR_SIGNALS_LIMITS} from '@cloudcart/nitrogen';

/*
 * Lists the visitor keeps in their own browser, as Shopify storefronts do:
 * the products they viewed and the products they compare. Nothing is sent to
 * the store until a page asks for the products themselves.
 */

/** The viewed products: Nitrogen's visitor signals keep them (the product page records a view), the search panel lists them. */
export const RECENTLY_VIEWED = {key: RECENTLY_VIEWED_KEY, max: VISITOR_SIGNALS_LIMITS.viewed};
export const COMPARE = {key: 'nitrogen:compare', max: 3};

type ListConfig = {key: string; max: number};

/** The list as stored, or `null`: a string, so React can tell whether it changed. */
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse(stored: string | null): string[] {
  try {
    const value = JSON.parse(stored ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function read(key: string): string[] {
  return parse(readStored(key));
}

function write(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
    // Other components on the page using the same list follow the change.
    window.dispatchEvent(new CustomEvent(PRODUCT_LIST_EVENT, {detail: key}));
  } catch {
    // Storage is unavailable (private mode, blocked): the list simply is not kept.
  }
}

/** A product list kept in the browser: most recent first, at most `max` ids. Empty until the page has hydrated. */
export function useProductList({key, max}: ListConfig) {
  // The server and the hydrating render see an empty list; the browser's own follows.
  const stored = useSyncExternalStore(
    useCallback((changed: () => void) => subscribe(key, changed), [key]),
    () => readStored(key),
    () => null,
  );
  const ids = useMemo(() => parse(stored), [stored]);

  const add = useCallback(
    (id: string) => write(key, [id, ...read(key).filter((item) => item !== id)].slice(0, max)),
    [key, max],
  );
  const remove = useCallback(
    (id: string) =>
      write(
        key,
        read(key).filter((item) => item !== id),
      ),
    [key],
  );
  const clear = useCallback(() => write(key, []), [key]);

  return {ids, add, remove, clear};
}

/** Calls `changed` when the list changes: in this tab (`write`) or in another (`storage`). */
function subscribe(key: string, changed: () => void): () => void {
  const sync = (event: Event) => {
    if ((event as CustomEvent).detail === key || event.type === 'storage') changed();
  };
  window.addEventListener(PRODUCT_LIST_EVENT, sync);
  window.addEventListener('storage', sync);
  return () => {
    window.removeEventListener(PRODUCT_LIST_EVENT, sync);
    window.removeEventListener('storage', sync);
  };
}
