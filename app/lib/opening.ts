import {startTransition, useEffect, useEffectEvent, useState} from 'react';
import {type Location, useLocation, useNavigation} from 'react-router';
import type {ProductItemImageFragment, ProductItemMoneyFragment} from 'storefrontapi.generated';
import {useSwiping} from '~/lib/page-swipe';

/**
 * How long a page may take before the page being opened is shown in its place, in milliseconds: an answer from the
 * page cache (~20 ms) comes first, and its page simply replaces the old one, with nothing in between to flash. Within
 * a tenth of a second a change still reads as immediate.
 */
const PENDING_AFTER_MS = 100;

/** How long after a click its navigation may start and still be the click's. */
const CLICK_MS = 1000;

/** How long after a click its page may come and still show the picture clicked under its own while that loads. */
const PICTURE_MS = 30_000;

/** What the visitor clicked to open another page, as the link showed it. */
export interface Opening {
  /** The path the link opens. */
  pathname: string;
  /** The page's name as the link gave it: its `title`, its heading, its label, or the words of a link without a picture. */
  title?: string;
  /** The address of the link's picture as the browser shows it now: shown again at once, nothing fetched. */
  picture?: string;
  /** A product card's own account of its product (`noteProduct`). */
  product?: OpenedProduct;
}

/** A product as its card showed it: the top of its page while the page loads. */
export interface OpenedProduct {
  title: string;
  vendor?: string | null;
  /** The picture the page opens on: the gallery asks for its own size of it at once. */
  image?: ProductItemImageFragment | null;
  /** How many pictures the card has: from two the page shows thumbnails beside its photograph. */
  pictures: number;
  /** The price of the variant the page opens on, and the one before it where the page shows it. */
  price?: ProductItemMoneyFragment | null;
  compareAtPrice?: ProductItemMoneyFragment | null;
}

/** The last click on a link to a page of this store, and when it was. */
let clicked: (Opening & {at: number}) | null = null;

/** The last product a swipe opened, with the picture its card showed (`SwipeablePage`), and when. */
let swiped: {pathname: string; picture: string; at: number} | null = null;

/** A path as its letters, for comparing an encoded one with one that is not. */
function decoded(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

const words = (text: string | null | undefined) => text?.replace(/\s+/g, ' ').trim().slice(0, 200) || undefined;

/** A link's name for the page it opens: given outright, its heading, or its own words when it is not a picture. */
function nameOf(link: HTMLAnchorElement): string | undefined {
  return (
    words(link.getAttribute('title')) ??
    words(link.querySelector('h1, h2, h3, h4, h5, h6')?.textContent) ??
    words(link.getAttribute('aria-label')) ??
    (link.querySelector('img') ? undefined : words(link.textContent))
  );
}

/** Notes a click on a link to another page of this store, before the link's own handler opens it. */
function onClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(link instanceof HTMLAnchorElement) || link.origin !== window.location.origin) return;
  if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  const picture = link.querySelector('img');
  clicked = {
    pathname: link.pathname,
    title: nameOf(link),
    picture: picture ? picture.currentSrc || picture.src || undefined : undefined,
    at: performance.now(),
  };
}

/** Notes a search form sent: its results page opens as any other. */
function onSubmit(event: SubmitEvent) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.method !== 'get') return;
  const action = new URL(form.action, window.location.href);
  if (action.origin === window.location.origin) clicked = {pathname: action.pathname, at: performance.now()};
}

/** Listens for the clicks that open pages, once for the tab. */
export function listenForOpenings() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('submit', onSubmit, true);
  };
}

/**
 * A product card's own account of the product it opens — its link's `onClick`, which runs after the click is noted —
 * and the address of the picture the page opens on, as the card loaded it.
 */
export function noteProduct(link: HTMLAnchorElement, product: OpenedProduct, picture?: string) {
  // Only the click just noted: a click that opens no page here (a new tab, say) noted nothing.
  if (!clicked || clicked.pathname !== link.pathname || performance.now() - clicked.at > CLICK_MS) return;
  clicked.product = product;
  if (picture) clicked.picture = picture;
}

/**
 * The picture the link to `pathname` showed, as the browser loaded it — or the card's picture of the product a swipe
 * opened: the page's own photograph stands over it while it loads, so the picture stays in view (B-540).
 */
export function openedPicture(pathname: string): string | undefined {
  const opened = [clicked, swiped].find(
    (opening) =>
      opening && performance.now() - opening.at < PICTURE_MS && decoded(opening.pathname) === decoded(pathname),
  );
  return opened?.picture;
}

/** Notes the product a swipe opens and its card's picture, which its page shows under its photograph until it loads. */
export function noteSwipe(pathname: string, picture: string | undefined) {
  swiped = picture ? {pathname, picture, at: performance.now()} : null;
}

/** The click a navigation came from, decided once, as the navigation starts. */
let decided: {key: string; opening: Opening | null} | null = null;

function openingFor(next: Location): Opening | null {
  if (decided?.key !== next.key) {
    const click = clicked;
    decided = {
      key: next.key,
      opening:
        click && performance.now() - click.at < CLICK_MS && decoded(click.pathname) === decoded(next.pathname)
          ? click
          : null,
    };
  }
  return decided.opening;
}

/** A page being opened from a click, shown while it loads. */
export interface Pending {
  location: Location;
  opening: Opening;
}

/**
 * The page the visitor opened with a click, while it loads, once it has taken longer than a moment
 * (`PENDING_AFTER_MS`); none for anything else — a filter or an order on the same page, a step back or forward (the
 * page comes back at its scroll), a swipe (its page is already shown) or a form's post. Once shown it stays until
 * the navigation ends: through a redirect on the way, and until another click's page takes its place.
 */
export function usePendingPage(): Pending | null {
  const navigation = useNavigation();
  const {pathname} = useLocation();
  const swiping = useSwiping();
  const [shown, setShown] = useState<Pending | null>(null);
  const idle = navigation.state === 'idle';
  const next = navigation.state === 'loading' && !swiping ? navigation.location : undefined;
  const opening = next && decoded(next.pathname) !== decoded(pathname) ? openingFor(next) : null;
  const candidate = next && opening ? {location: next, opening} : null;
  const key = candidate?.location.key;

  // The page loaded: the next navigation starts with nothing shown.
  if (idle && shown) setShown(null);

  // A transition, as the router's own updates are: the page cross-fades to it (`PageTransition`).
  const show = useEffectEvent(() => startTransition(() => setShown(candidate)));
  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(show, PENDING_AFTER_MS);
    return () => clearTimeout(timer);
  }, [key]);

  return idle ? null : shown;
}
