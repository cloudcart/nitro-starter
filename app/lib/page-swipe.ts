import {useSyncExternalStore} from 'react';

/** How long kept data is shown for a page beside another: the page itself loads again when it opens. */
const FRESH_MS = 60_000;

/** The most pages kept: a page and its neighbours, and the ones just left. */
const KEPT = 8;

/** Route data loaded ahead for a swipe (a neighbour's page shown beside this one), or just left, by path. */
const loaded = new Map<string, {data: unknown; at: number}>();

/** Keeps a page's route data, loaded ahead or just left: it is not loaded again for a page shown beside another. */
export function keepPage(path: string, data: unknown) {
  loaded.delete(path);
  loaded.set(path, {data, at: Date.now()});
  while (loaded.size > KEPT) loaded.delete(loaded.keys().next().value!);
}

/** A page's route data, if it was loaded within the last minute. */
export function keptPage(path: string): unknown {
  const kept = loaded.get(path);
  return kept && Date.now() - kept.at <= FRESH_MS ? kept.data : undefined;
}

/** This page's place in the tab's history (React Router's `history.state.idx`); none outside its router. */
export function historyIndex(): number | undefined {
  const index: unknown = typeof window === 'undefined' ? undefined : window.history.state?.idx;
  return typeof index === 'number' ? index : undefined;
}

/** The pages this tab showed, by their place in its history: a swipe back to the one just behind steps back to it. */
const shown = new Map<number, string>();

/** Notes the page now shown at its place in the history. */
export function notePage(path: string) {
  const index = historyIndex();
  if (index !== undefined) shown.set(index, path);
}

/** Whether `path` is the page just behind this one in the history: going to it is a step back, to where it was. */
export function isJustBehind(path: string): boolean {
  const index = historyIndex();
  return index !== undefined && shown.get(index - 1) === path;
}

/** The listing a product was opened from, as it looked then: what a swipe back to it shows coming in. */
let listingPicture: {path: string; page: Element; top: number; scrolled: number} | null = null;

/** Keeps how a listing's page (`main`) looks now, without its ids, which the page itself keeps. */
export function keepListingPicture(path: string, main: Element) {
  const page = main.cloneNode(true) as Element;
  for (const element of page.querySelectorAll('[id]')) element.removeAttribute('id');
  listingPicture = {path, page, top: main.getBoundingClientRect().top + window.scrollY, scrolled: window.scrollY};
}

/** The listing's picture, when this tab kept one of it. */
export function listingPictureOf(path: string) {
  return listingPicture?.path === path ? listingPicture : null;
}

let swiping = false;
const listeners = new Set<() => void>();

/**
 * Whether a swipe is changing the page: its new page has already slid in, shown from the data loaded ahead, so
 * `PageTransition` animates nothing and `NavigationProgress` shows nothing while the page itself loads behind it.
 */
export function setSwiping(value: boolean) {
  if (swiping === value) return;
  swiping = value;
  for (const listener of listeners) listener();
}

/** Whether a swipe is changing the page now: read once by a page as it mounts. */
export function isSwiping(): boolean {
  return swiping;
}

export function useSwiping(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => swiping,
    () => false,
  );
}
