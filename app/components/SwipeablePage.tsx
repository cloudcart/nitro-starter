import {
  type ReactNode,
  type RefObject,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router';
import {keepPage, keptPage, openKeptPage, useLoadPageAhead} from '@cloudcart/nitrogen-react';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import type {ListedProduct, Neighbours} from '~/lib/listing-context';
import {reducedMotion} from '~/lib/motion';
import {historyIndex, isJustBehind, isSwiping, listingPictureOf, notePage, setSwiping} from '~/lib/page-swipe';
import {BELOW_MD} from '~/lib/breakpoints';
import {noteSwipe} from '~/lib/opening';
import {dragDirection, leansAcross, opensNeighbour, type Sample, slideFinish, speedOf} from '~/lib/swipe-gesture';

/** How long data loaded for a page beside this one opens it: the page cache keeps a page fresh as long. */
const FRESH_MS = 60_000;

/** A phone: below the theme's `md`. */
const PHONE = BELOW_MD;

/** Where there is no product that way, the page follows a third of the finger and comes back. */
const HELD_BACK = 1 / 3;

/** How long a step back through the history may take before the page is brought back. */
const BACK_WAIT_MS = 3000;

/** The finger's moves kept for its speed at the end: more than its last 100 ms hold at any rate of events. */
const KEPT_SAMPLES = 32;

/**
 * Where a drag does not start: what has its own sideways touch, and the full-screen gallery. An element inside the page
 * that scrolls up and down sets `touch-pan-y` itself: the browser reads `touch-action` only up to the first element
 * that scrolls (MDN), so the page's would not reach a touch on it (B-353).
 */
const OWN_TOUCH = 'dialog, input, select, textarea, [class*="cc-spin-image"]';

/** Where the neighbours' pages stand: under what is above the page, their content where the page's would be. */
interface Geometry {
  /** The panel's top on the screen: the page's top, or the screen's when the page is scrolled past it. */
  top: number;
  /** The page's top in the document: the neighbour opens scrolled to it. */
  pageTop: number;
  /** Where this page's photograph and title stand in the document, for a neighbour shown from its listing card. */
  photo: {top: number; height: number};
  titleTop: number | null;
}

function subscribeToPhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Whether the screen is a phone's; never on the server, whose page has no swipe. */
function usePhone(): boolean {
  return useSyncExternalStore(
    subscribeToPhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/**
 * A page a phone's visitor swipes across to the next or previous product of the listing they came from, as a carousel;
 * from the product opened from the listing, back to the listing. Once the page has loaded, its neighbours' pages load
 * too (unless they were loaded a moment ago) and are rendered ahead beside it, out of sight (`preview`), pictures and
 * all; the listing is shown as it looked when left (`ListingPicture`). A sideways drag anywhere on the page — not in a
 * field, the full-screen gallery, a 360° spin or a row that scrolls sideways — moves it with the finger, its buy parts
 * (`data-swipe-hidden`) fading out, and the neighbour's page comes in beside it, under the header, without them. Let go
 * past a quarter of the screen, or flicked, the neighbour takes the screen, and its page — stepped back to in the
 * history when it is the one just behind, at its scroll, otherwise opened, loading behind what is shown — replaces it
 * with no transition (`setSwiping`); its buy parts come once it is in (`data-arrived`; the `swipe-page` utility).
 * Otherwise both slide back, the buy parts with them. Where there is nothing that way the page follows a third of the
 * finger; the browser's own sideways swipe through history is off meanwhile (`data-page-swipes` on `<html>`, app.css).
 * A thumb sweeps in an arc: once a drag goes across, the browser's own scroll is held for that touch (`touchmove`), as
 * Safari would otherwise scroll on the arc's first wobble and take the touch away (T-568). A flick is read from the
 * finger's last moments, and the page finishes its slide at the finger's speed (`swipe-gesture.ts`).
 * A neighbour not loaded yet shows its listing card's picture and title, and loads when let go. Nothing moves for a
 * visitor who asks for less motion, or while the page is zoomed in (a sideways move pans it then); the swipe still
 * opens the neighbour.
 */
export function SwipeablePage({
  data,
  neighbours: {previous, next, listing},
  preview,
  className,
  children,
}: {
  /** This page's route data: kept when the visitor swipes away, so swiping back opens it at once. */
  data: unknown;
  /** The listing's products either side, and before the product opened from it, the listing itself. */
  neighbours: Neighbours;
  /**
   * A neighbour's page from its route data, as the page itself renders it, with its card's picture under its
   * photograph until that loads: the picture shown before the data came stays in view (B-540).
   */
  preview: (data: unknown, picture?: string) => ReactNode;
  className: string;
  children: ReactNode;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const previousPanelRef = useRef<HTMLDivElement>(null);
  const nextPanelRef = useRef<HTMLDivElement>(null);
  const phone = usePhone();
  // The neighbours' route data, loaded ahead or kept from a moment ago; null for one whose load was redirected or failed.
  const [ahead, setAhead] = useState<Record<string, unknown>>({});
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const navigate = useNavigate();
  // A page a swipe brought in: its buy parts come now, the page being in.
  const [arrived] = useState(isSwiping);
  const dataOf = (product?: ListedProduct) =>
    product && (product.path in ahead ? ahead[product.path] : keptPage(product.path, {maxAge: FRESH_MS}));

  useEffect(() => {
    const page = pageRef.current;
    if (!page || (!previous && !next)) return;
    let drag: {x: number; y: number; id: number; samples: Sample[]; across?: boolean} | null = null;
    let measured = false;
    let swiped = false;
    const touches = new Set<number>();
    const running: Animation[] = [];
    let backTimer: ReturnType<typeof setTimeout> | undefined;
    const panelOf = (step: 1 | -1) => (step > 0 ? nextPanelRef : previousPanelRef).current;

    const stop = () => {
      for (const animation of running.splice(0)) animation.cancel();
    };
    const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;
    // While zoomed in the page pans sideways; otherwise a sideways move is the swipe's (the class's `pan-y`).
    const onZoom = () => {
      page.style.touchAction = zoomed() ? 'auto' : '';
    };
    const ownTouch = (target: EventTarget | null) => {
      if (!(target instanceof Element) || target.closest(OWN_TOUCH)) return true;
      for (let element: Element | null = target; element && element !== page; element = element.parentElement) {
        const scrolls = /auto|scroll/.test(getComputedStyle(element).overflowX);
        if (scrolls && element.scrollWidth > element.clientWidth + 1) return true;
      }
      return false;
    };
    const measure = () => {
      const pageBox = page.getBoundingClientRect();
      const photo = page.querySelector('[data-page-photo]')?.getBoundingClientRect();
      const title = page.querySelector('h1')?.getBoundingClientRect();
      setGeometry({
        top: Math.max(0, pageBox.top),
        pageTop: pageBox.top + window.scrollY,
        photo: photo ? {top: photo.top + window.scrollY, height: photo.height} : {top: 0, height: window.innerWidth},
        titleTop: title ? title.top + window.scrollY : null,
      });
    };

    /** The page and the neighbour that way at `dx` across, the page's buy parts gone; the other neighbour out of sight. */
    const place = (dx: number, step: 1 | -1, coming: boolean) => {
      page.dataset.swiping = '';
      page.style.position = 'relative';
      page.style.left = `${dx}px`;
      for (const side of [1, -1] as const) {
        const panel = panelOf(side);
        if (!panel) continue;
        const shown = coming && side === step;
        panel.style.visibility = shown ? 'visible' : 'hidden';
        panel.style.transform = `translateX(${side * window.innerWidth + (shown ? dx : 0)}px)`;
      }
    };
    const follow = (dx: number) => {
      const step = dx < 0 ? 1 : -1;
      const coming = Boolean(step > 0 ? next : (previous ?? listing));
      if (reducedMotion()) return;
      if (!measured) {
        measured = true;
        measure();
      }
      stop();
      place(coming ? dx : dx * HELD_BACK, step, coming);
    };

    const clear = () => {
      delete page.dataset.swiping;
      page.style.removeProperty('position');
      page.style.removeProperty('left');
      for (const side of [1, -1] as const) panelOf(side)?.style.setProperty('visibility', 'hidden');
      measured = false;
    };
    /** The page back in its place, starting at its own `speed` across when the finger let it go moving. */
    const back = (speed = 0) => {
      const left = page.style.left;
      stop();
      if (!left || reducedMotion()) return clear();
      const offset = parseFloat(left) || 0;
      const timing = slideFinish(Math.abs(offset), -Math.sign(offset) * speed);
      running.push(page.animate([{left}, {left: '0px'}], timing));
      for (const side of [1, -1] as const) {
        const panel = panelOf(side);
        if (panel?.style.visibility !== 'visible') continue;
        const away = `translateX(${side * window.innerWidth}px)`;
        running.push(panel.animate([{transform: panel.style.transform}, {transform: away}], timing));
        panel.style.transform = away;
      }
      void running[0].finished.then(clear, () => {});
    };

    /** A drag let go `dx` across (null: given up), the finger at `speed` (signed, px/ms). */
    const release = (dx: number | null, speed: number) => {
      const step = dx !== null && dx < 0 ? 1 : -1;
      const to = dx === null ? undefined : step > 0 ? next?.path : (previous?.path ?? listing?.path);
      if (dx === null) return back();
      // Where there is nothing that way the page moved at a third of the finger's speed.
      if (!to) return back(speed * HELD_BACK);
      if (!opensNeighbour(dx, speed, window.innerWidth)) return back(speed);
      // The page just behind in the history — the product swiped from, or the listing opened from — is stepped back
      // to, where it was; any other is opened.
      const index = historyIndex();
      const stepBack =
        step < 0 &&
        (previous
          ? isJustBehind(previous.path)
          : listing?.index !== undefined && index !== undefined && listing.index === index - 1);
      const open = () => {
        const from = window.location.pathname;
        // This page stays loaded for a swipe back. The neighbour's page opens from the data loaded ahead for it, at
        // once, with no transition — over its card's picture until its photograph loads (B-540) — or, without it, stays
        // in place while its own loads behind it.
        if (!window.location.search) keepPage(from, data);
        noteSwipe(to, step > 0 ? next?.picture : previous?.picture);
        setSwiping(true);
        if (stepBack) {
          void navigate(-1);
          // A step back that never comes (the history ended elsewhere) brings the page back; once it comes, the page
          // is gone and the wait with it.
          backTimer = setTimeout(() => {
            if (window.location.pathname !== from) return;
            setSwiping(false);
            stop();
            clear();
          }, BACK_WAIT_MS);
          return;
        }
        openKeptPage(to, {maxAge: FRESH_MS});
        void Promise.resolve(navigate(to)).finally(() => {
          // A navigation that did not leave (stopped, or answered in place) brings the page back at once.
          if (window.location.pathname !== from) return;
          setSwiping(false);
          stop();
          clear();
        });
      };
      const panel = panelOf(step);
      if (reducedMotion() || !panel) return open();
      // The page goes out the way the finger went, at its speed, and its neighbour takes the screen; then it opens there.
      stop();
      const timing = {...slideFinish(window.innerWidth - Math.abs(dx), -step * speed), fill: 'forwards' as const};
      const gone = -step * window.innerWidth;
      const out = page.animate([{left: page.style.left || '0px'}, {left: `${gone}px`}], timing);
      running.push(out, panel.animate([{transform: panel.style.transform}, {transform: 'none'}], timing));
      void out.finished.then(open, () => {});
    };

    const onDown = (event: PointerEvent) => {
      swiped = false;
      if (event.pointerType !== 'touch') return;
      touches.add(event.pointerId);
      // A second finger is a pinch: a drag under way gives up and the page goes back.
      if (touches.size > 1) {
        if (drag?.across) release(null, 0);
        drag = null;
        return;
      }
      const starts = window.matchMedia(PHONE).matches && !zoomed() && !ownTouch(event.target);
      drag = starts
        ? {x: event.clientX, y: event.clientY, id: event.pointerId, samples: [{x: event.clientX, t: event.timeStamp}]}
        : null;
    };
    const sample = (event: PointerEvent) => {
      drag?.samples.push({x: event.clientX, t: event.timeStamp});
      if (drag && drag.samples.length > KEPT_SAMPLES) drag.samples.shift();
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      sample(event);
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (drag.across === undefined) {
        const direction = dragDirection(dx, dy);
        if (!direction) return;
        drag.across = direction === 'across';
      }
      // Up and down is the browser's: it scrolls.
      if (drag.across) follow(dx);
    };
    // The browser's scroll held for the one finger of a drag that goes across — already while its move inside the
    // slack leans sideways — so Safari does not take the touch on the thumb's arc (WebKit bug 232545). A touch
    // the browser already scrolls cannot be held (`cancelable` false), and up and down stays the browser's.
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!drag || !event.cancelable || event.touches.length !== 1 || !touch) return;
      const dx = touch.clientX - drag.x;
      const dy = touch.clientY - drag.y;
      const across = drag.across ?? leansAcross(dx, dy);
      if (across) event.preventDefault();
    };
    const onUp = (event: PointerEvent) => {
      touches.delete(event.pointerId);
      if (!drag || drag.id !== event.pointerId) return;
      sample(event);
      const {x, samples, across} = drag;
      drag = null;
      if (!across) return;
      swiped = true;
      release(event.clientX - x, speedOf(samples));
    };
    const onCancel = (event: PointerEvent) => {
      // The browser took the move (a scroll), or the touch was lost: a drag under way goes back.
      touches.delete(event.pointerId);
      if (drag?.id !== event.pointerId) return;
      const {across} = drag;
      drag = null;
      if (across) release(null, 0);
    };
    // A drag is not a tap on what it started on.
    const onClick = (event: MouseEvent) => {
      if (!swiped) return;
      swiped = false;
      event.preventDefault();
      event.stopPropagation();
    };

    onZoom();
    document.documentElement.setAttribute('data-page-swipes', '');
    page.addEventListener('pointerdown', onDown);
    page.addEventListener('pointermove', onMove);
    page.addEventListener('pointerup', onUp);
    page.addEventListener('pointercancel', onCancel);
    page.addEventListener('touchmove', onTouchMove, {passive: false});
    page.addEventListener('click', onClick, true);
    window.visualViewport?.addEventListener('resize', onZoom);
    return () => {
      document.documentElement.removeAttribute('data-page-swipes');
      clearTimeout(backTimer);
      page.removeEventListener('pointerdown', onDown);
      page.removeEventListener('pointermove', onMove);
      page.removeEventListener('pointerup', onUp);
      page.removeEventListener('pointercancel', onCancel);
      page.removeEventListener('touchmove', onTouchMove);
      page.removeEventListener('click', onClick, true);
      window.visualViewport?.removeEventListener('resize', onZoom);
    };
  }, [previous, next, listing, navigate, data]);

  // Where this page stands in the tab's history, for a swipe back to it from the next one.
  useEffect(() => notePage(window.location.pathname), []);

  return (
    <div
      ref={pageRef}
      data-arrived={arrived || undefined}
      className={`${className} swipe-page max-md:touch-pan-y max-md:touch-pinch-zoom`}
    >
      {children}
      {phone &&
        [previous, next].map(
          (product) =>
            product &&
            dataOf(product) === undefined && (
              <Preload
                key={product.path}
                path={product.path}
                onLoad={(loaded) => setAhead((current) => ({...current, [product.path]: loaded}))}
              />
            ),
        )}
      {phone && !previous && listing && (
        <NeighbourPanel key={listing.path} step={-1} panelRef={previousPanelRef} geometry={geometry}>
          <ListingPicture path={listing.path} geometry={geometry} />
        </NeighbourPanel>
      )}
      {phone &&
        ([-1, 1] as const).map((step) => {
          const product = step > 0 ? next : previous;
          if (!product) return null;
          const loaded = dataOf(product);
          return (
            <NeighbourPanel
              key={product.path}
              step={step}
              panelRef={step > 0 ? nextPanelRef : previousPanelRef}
              geometry={geometry}
            >
              {loaded != null ? (
                <div className={className} style={geometry ? {marginTop: geometry.pageTop - geometry.top} : undefined}>
                  {preview(loaded, product.picture)}
                </div>
              ) : (
                <ListedPreview product={product} geometry={geometry} />
              )}
            </NeighbourPanel>
          );
        })}
    </div>
  );
}

/**
 * Loads a neighbour's route data once the page is idle, kept for its opening (`useLoadPageAhead`), then hands it over —
 * null when the load was redirected or failed — and is gone, its fetcher with it.
 */
function Preload({path, onLoad}: {path: string; onLoad: (data: unknown) => void}) {
  const {load, data: loaded} = useLoadPageAhead();
  useEffect(() => {
    const start = () => load(path);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, {timeout: 2000});
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(start, 200);
    return () => clearTimeout(timer);
  }, [load, path]);
  // Handed over once: the parent then stops rendering this.
  const handOver = useEffectEvent((data: unknown) => onLoad(data));
  useEffect(() => {
    if (loaded !== undefined) handOver(loaded);
  }, [loaded]);
  return null;
}

/**
 * A neighbour's page beside the page, out of sight until a drag brings it in: under the header and outside the page's
 * own transition, which the neighbour's page replaces. Hidden from assistive technology and the keyboard. Its buy
 * parts are not shown, their room kept (`swipe-preview`): they come with the page itself once it is in (B-354).
 */
function NeighbourPanel({
  step,
  panelRef,
  geometry,
  children,
}: {
  step: 1 | -1;
  panelRef: RefObject<HTMLDivElement | null>;
  geometry: Geometry | null;
  children: ReactNode;
}) {
  return createPortal(
    <div
      ref={panelRef}
      aria-hidden="true"
      inert
      className="pointer-events-none invisible fixed inset-x-0 bottom-0 z-30 overflow-hidden bg-background swipe-preview"
      style={{top: geometry?.top ?? 0, transform: `translateX(${step * 100}%)`}}
    >
      {children}
    </div>,
    document.body,
  );
}

/** A neighbour not loaded yet: its listing card's picture and title where this page's photograph and title stand. */
function ListedPreview({product, geometry}: {product: ListedProduct; geometry: Geometry | null}) {
  if (!geometry) return null;
  return (
    <>
      <div
        className="absolute inset-x-0"
        style={{top: geometry.photo.top - geometry.top, height: geometry.photo.height}}
      >
        {product.picture ? (
          <img src={product.picture} alt="" className="size-full object-contain" />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      {geometry.titleTop !== null && (
        <div
          className="absolute inset-x-0 flex flex-col gap-3 px-gutter"
          style={{top: geometry.titleTop - geometry.top}}
        >
          {product.title && <p className="text-product wrap-break-word">{product.title}</p>}
          <span className="h-lh w-1/3 bg-surface" />
        </div>
      )}
    </>
  );
}

/**
 * The listing the product was opened from, as it looked when the visitor left it (`keepListingPicture`), at the scroll
 * it is stepped back to. Nothing when this tab kept no picture of it (the page reloaded since): its background only.
 */
function ListingPicture({path, geometry}: {path: string; geometry: Geometry | null}) {
  const boxRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const picture = listingPictureOf(path);
    if (!box || !picture) return;
    box.replaceChildren(picture.page.cloneNode(true));
    return () => box.replaceChildren();
  }, [path]);
  const picture = listingPictureOf(path);
  const offset = picture && geometry ? picture.top - picture.scrolled - geometry.top : 0;
  return <div ref={boxRef} style={{transform: `translateY(${offset}px)`}} />;
}
