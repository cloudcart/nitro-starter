import {type ReactNode, type Ref, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {Image, MediaFile, type MediaData} from '@cloudcart/nitrogen-react';
import {Dialog} from '~/components/Dialog';
import {ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlayIcon} from '~/components/ui/icons';
import {Badge} from '~/components/ui/Badge';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import {reducedMotion} from '~/lib/motion';
import {GALLERY_FRAME, GALLERY_STAGE, SLIDE_SIZES} from '~/components/ProductLayout';

/** One of the product's media, as the product query reads `Product.media`. */
type GalleryMedia = MediaData & {id: string};

/** The variant the gallery shows: its picture, and the media the merchant linked to it (`ProductVariant.mediaIds`). */
type GalleryVariant = {image?: {url: string} | null; mediaIds?: readonly string[]} | null | undefined;

/** A box on the screen, in CSS pixels from the viewport's corner. */
type Box = {left: number; top: number; width: number; height: number};

/** Where a photograph is in the page: its visible box, and the picture the browser already shows there. */
type Origin = Box & {src: string};

/** The full-screen gallery zooms a photograph to its own size, but never more than this many times its whole view. */
const MAX_ZOOM = 3;

/** A photograph less than this many times larger than its whole view does not zoom: there is no more to see. */
const MIN_ZOOM = 1.2;

/** How far a click zooms a photograph whose size the API does not give. */
const UNKNOWN_ZOOM = 2;

/** How long a photograph flies between the page and the full-screen gallery, in milliseconds. */
const FLIGHT_MS = 300;

/** The flight's easing: quick to leave, gentle to land. */
const FLIGHT_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/** The most dots a phone shows: they say which way the photographs go and where the visitor is, not how many. */
const MAX_DOTS = 3;

/**
 * The product's media — photographs, YouTube videos and 360° spins — as a slideshow in a square that always fits the
 * screen. On a phone it pages up and down, swiped, with up to three dots down its left (a sideways swipe is the
 * page's: `SwipeablePage`); from 750 px it pages sideways, with previous and next buttons, a counter and thumbnails
 * (under it, then to its left from 990 px). The pointer over a photograph shows a magnifier; a click
 * flies it into a full-screen gallery of the photographs. A variant the merchant linked pictures to shows those alone;
 * choosing a variant brings its picture forward. The media are shown as sf lists them: it leaves out a row without a
 * file, and puts no placeholder among them (B-212).
 */
export function ProductGallery({
  media,
  variant,
  title,
  backdrop,
}: {
  media: GalleryMedia[];
  variant: GalleryVariant;
  title: string;
  /** The picture the page was opened from, as the browser loaded it: under the first photograph until it loads. */
  backdrop?: string;
}) {
  // The variant's own media, in its order, when the merchant linked any to it, and the whole gallery when none: the
  // API's rule for `mediaIds` (B-388). Another set of media is another slideshow, from its start.
  const own = variant?.mediaIds?.length ? variant.mediaIds.flatMap((id) => media.filter((item) => item.id === id)) : [];
  const shown = own.length ? own : media;
  return (
    <Slideshow
      key={shown.map((item) => item.id).join(' ')}
      media={shown}
      variantImage={variant?.image}
      title={title}
      backdrop={backdrop}
    />
  );
}

/** The slideshow of one set of media, bringing the variant's picture forward as it changes. */
function Slideshow({
  media,
  variantImage,
  title,
  backdrop,
}: {
  media: GalleryMedia[];
  variantImage: {url: string} | null | undefined;
  title: string;
  backdrop?: string;
}) {
  const {t} = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  // The slides' photographs by media id: the full-screen gallery flies from them and back to them.
  const slidePhotosRef = useRef(new Map<string, HTMLButtonElement>());
  const [current, setCurrent] = useState(0);
  const [opened, setOpened] = useState<{index: number; origin: Origin} | null>(null);
  // The slide whose photograph the full-screen gallery shows, hidden in the page meanwhile so it is not seen twice.
  const [lifted, setLifted] = useState<string | null>(null);
  const total = media.length;

  /**
   * Scrolls the slideshow to a slide, down on a phone and across from 750 px; smoothly, unless the visitor asks for
   * less motion (the track's CSS).
   */
  const go = (index: number, behavior?: ScrollBehavior) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo(
      pagesDown(track) ? {top: index * track.clientHeight, behavior} : {left: index * track.clientWidth, behavior},
    );
  };

  // A newly chosen variant brings its picture forward; on the first render it is simply there — placed before the
  // page paints, so a product opened from a card's variant shows that picture, not the first (B-491).
  const variantIndex = variantImage ? media.findIndex((item) => item.previewImage?.url === variantImage.url) : -1;
  // The slide the page opens on: the one the picture clicked stands under (T-571).
  const [openedOn] = useState(Math.max(variantIndex, 0));
  // The thumbnails' pictures as the browser loaded them, by media id: a slide shows its own under its photograph
  // until that loads, rather than a blank (T-573).
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const shownRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (variantIndex < 0 || variantIndex === shownRef.current) return;
    go(variantIndex, shownRef.current === null ? 'instant' : undefined);
    shownRef.current = variantIndex;
  }, [variantIndex]);

  if (total === 0) {
    return (
      <div className="aspect-square max-h-sticky-height w-full">
        <ImagePlaceholder />
      </div>
    );
  }

  const photographs = media.filter((item) => item.mediaContentType === 'IMAGE');
  const sizes = total > 1 ? SLIDE_SIZES.withThumbnails : SLIDE_SIZES.alone;

  /** Brings a photograph's slide into view at once and gives its photograph's box: the full-screen gallery lands there. */
  const slideBox = (id: string): Origin | null => {
    const index = media.findIndex((item) => item.id === id);
    const button = slidePhotosRef.current.get(id);
    if (index < 0 || !button) return null;
    go(index, 'instant');
    return photoBox(button, media[index].previewImage);
  };

  return (
    <section aria-roledescription={t('gallery.carousel')} aria-label={t('gallery.label')} className={GALLERY_FRAME}>
      {/* On a phone a container as wide as the track: the track's height follows its width in whole pixels. */}
      <div className="group/stage relative min-w-0 flex-1 max-md:@container">
        <div
          ref={trackRef}
          onScroll={(event) => {
            const track = event.currentTarget;
            setCurrent(
              pagesDown(track)
                ? Math.round(track.scrollTop / Math.max(track.clientHeight, 1))
                : Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)),
            );
          }}
          // A phone pages up and down; from 750 px the slideshow pages sideways. A scroller, it says itself that a
          // sideways move is not the browser's: the page's `pan-y` stops at it, and the page's swipe would be cut
          // (`SwipeablePage`, B-353). Its height in whole pixels on a phone (`h-photo-square`, B-356).
          className={`scrollbar-none flex ${GALLERY_STAGE} snap-mandatory scroll-smooth max-md:touch-pan-y max-md:touch-pinch-zoom max-md:flex-col max-md:snap-y max-md:overflow-y-auto md:snap-x md:overflow-x-auto`}
        >
          {media.map((item, index) => (
            <div
              key={item.id}
              role="group"
              aria-roledescription={t('gallery.slide')}
              aria-label={t('gallery.position', {index: index + 1, total})}
              // Only the slide in view can be reached: the others' players and controls are off the screen.
              inert={index !== current}
              // A flex box: its photograph's button (an inline-block) or player stands on no line of text, whose descent
              // would reach past the slide and leave the track a few pixels to scroll after the last photograph — a
              // swipe there would stay with the track instead of scrolling the page on (B-356).
              className="relative flex h-full w-full shrink-0 snap-center"
            >
              {item.mediaContentType === 'IMAGE' ? (
                <Photo
                  ref={(button) => {
                    if (button) slidePhotosRef.current.set(item.id, button);
                    else slidePhotosRef.current.delete(item.id);
                  }}
                  item={item}
                  alt={title}
                  eager={index === 0}
                  sizes={sizes}
                  // The photograph the page opens on: the picture clicked stays in view under it until it loads (T-571).
                  backdrop={(index === openedOn ? backdrop : undefined) ?? thumbnails[item.id]}
                  lifted={lifted === item.id}
                  // The picture's own description stays in the button's name (B-211).
                  label={
                    (item.alt ?? item.previewImage?.altText)
                      ? t('gallery.zoomInto', {alt: item.alt ?? item.previewImage?.altText ?? ''})
                      : t('gallery.zoom')
                  }
                  onOpen={(origin) => setOpened({index: photographs.indexOf(item), origin})}
                />
              ) : (
                // A video or a spin first is the page's largest paint as a photograph is (B-443).
                <MediaFile
                  data={item}
                  alt={title}
                  spinLabel={t('gallery.spin')}
                  sizes={sizes}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  className="size-full object-contain"
                />
              )}
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            {/* Shown while the pointer is over the photograph or a button has focus; always on a touch screen's tablet.
                On a phone they are the keyboard's and a screen reader's way through the photographs, seen only with the
                focus on them, pointing up and down as the photographs page. */}
            <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between opacity-100 transition-opacity max-md:not-focus-within:sr-only lg:opacity-0 lg:group-focus-within/stage:opacity-100 lg:group-hover/stage:opacity-100">
              <RoundButton label={t('gallery.previous')} disabled={current === 0} onClick={() => go(current - 1)}>
                <ChevronLeftIcon className="size-5 max-md:rotate-90" />
              </RoundButton>
              <RoundButton label={t('gallery.next')} disabled={current === total - 1} onClick={() => go(current + 1)}>
                <ChevronRightIcon className="size-5 max-md:rotate-90" />
              </RoundButton>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute right-3 bottom-3 hidden md:block">
              <Badge variant="plain">
                {current + 1} / {total}
              </Badge>
            </div>
            {/* On a phone, at most three dots down the photograph's left, in line with the page's text and close
                together: the way the photographs go, the current one larger. White blended by difference, they invert
                the picture under them, so they show on a light photograph and a dark one. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-gutter flex -translate-y-1/2 flex-col items-center gap-1 mix-blend-difference md:hidden"
            >
              {dotWindow(current, total).map((index) => (
                <span
                  key={index}
                  className={`rounded-full bg-difference transition-[width,height,opacity] ${index === current ? 'size-1.5' : 'size-1 opacity-60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <Thumbnails
          media={media}
          current={current}
          onPick={(index) => go(index)}
          onLoaded={(id, src) => setThumbnails((shown) => (shown[id] === src ? shown : {...shown, [id]: src}))}
          className="hidden md:flex lg:max-h-sticky-height lg:flex-col"
        />
      )}

      <Lightbox
        photographs={photographs}
        opened={opened}
        title={title}
        onLift={setLifted}
        slideBox={slideBox}
        onClose={() => {
          setOpened(null);
          setLifted(null);
        }}
      />
    </section>
  );
}

/**
 * A photograph of the slideshow. The pointer over it shows a magnifier and magnifies nothing; a click opens it full
 * screen, from the box it fills in the page.
 */
function Photo({
  ref,
  item,
  eager,
  sizes,
  backdrop,
  label,
  alt,
  lifted,
  onOpen,
}: {
  ref: Ref<HTMLButtonElement>;
  item: GalleryMedia;
  eager: boolean;
  /** The slide's width in the page. */
  sizes: string;
  /** A picture under the photograph until it loads: the one the page was opened from, or the slide's thumbnail. */
  backdrop?: string;
  label: string;
  /** The product's title: the photo's alt text when the merchant gave none. */
  alt: string;
  /** The full-screen gallery shows this photograph: the page hides it meanwhile. */
  lifted: boolean;
  onOpen: (origin: Origin) => void;
}) {
  // Gone once the photograph has loaded: a photograph with a transparent ground would show it through.
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={(event) => onOpen(photoBox(event.currentTarget, item.previewImage))}
      onLoad={() => setLoaded(true)}
      style={backdrop && !loaded ? {backgroundImage: `url(${JSON.stringify(backdrop)})`} : undefined}
      // The track scrolls, so a ring outside the slide would be cut off: it is drawn inside (B-194).
      className="relative size-full cursor-zoom-in overflow-hidden bg-contain bg-center bg-no-repeat focus-visible:-outline-offset-2"
    >
      <MediaFile
        data={item}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        // The first photograph is the page's largest paint: fetched before the rest (B-396).
        fetchPriority={eager ? 'high' : undefined}
        sizes={sizes}
        className={`size-full object-contain ${lifted ? 'invisible' : ''}`}
      />
    </button>
  );
}

/** The media as small squares to jump to; a video or a spin carries a play sign. */
function Thumbnails({
  media,
  current,
  onPick,
  onLoaded,
  className = '',
}: {
  media: GalleryMedia[];
  current: number;
  onPick: (index: number) => void;
  /** A thumbnail's picture has loaded: the address the browser chose for it. */
  onLoaded: (id: string, src: string) => void;
  className?: string;
}) {
  const {t} = useTranslation();
  const total = media.length;

  return (
    <div className={`scrollbar-none shrink-0 gap-2 overflow-auto ${className}`}>
      {media.map((item, index) => (
        <button
          key={item.id}
          type="button"
          aria-label={t('gallery.show', {index: index + 1, total})}
          aria-current={index === current}
          onClick={() => onPick(index)}
          onLoad={(event) => {
            const picture = event.target;
            if (picture instanceof HTMLImageElement && picture.currentSrc) onLoaded(item.id, picture.currentSrc);
          }}
          className={`relative size-16 shrink-0 overflow-hidden border-2 bg-background transition-colors focus-visible:-outline-offset-2 ${index === current ? 'border-foreground' : 'border-transparent hover:border-border'}`}
        >
          {item.previewImage ? (
            <Image data={item.previewImage} alt="" width={64} sizes="64px" className="size-full object-contain" />
          ) : (
            <ImagePlaceholder />
          )}
          {item.mediaContentType !== 'IMAGE' && (
            <span className="absolute inset-0 grid place-items-center bg-foreground/20 text-background">
              <PlayIcon className="size-5" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function RoundButton({
  ref,
  label,
  disabled,
  large = false,
  onClick,
  children,
  className = '',
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  disabled?: boolean;
  /** The main action of a row of round buttons: the full-screen gallery's close. */
  large?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`pointer-events-auto grid place-items-center rounded-full border border-border bg-background text-foreground shadow-raised transition-colors hover:border-foreground disabled:invisible ${large ? 'size-14' : 'size-11'} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * The photographs full screen, one at a time and whole, on the page's background. The one clicked flies there from its
 * place in the page, over the picture the page already shows, and flies back to its slide when the gallery closes.
 * Previous, close and next sit at the bottom (on a phone the close at the top right); the keyboard's arrows and a swipe
 * move between the photographs too, and a click beside the photograph closes. A click zooms the photograph to its own
 * size (at most `MAX_ZOOM` times its whole view), laid out at that size in a box that scrolls: a finger pans it with
 * the phone's own scrolling, a wheel or a trackpad scrolls it, and the mouse pointer and the arrow keys move around it.
 * Another click — on it or beside it — zooms back to the gallery. Every change of size flies from the old box to the
 * new; with reduced motion nothing flies.
 */
function Lightbox({
  photographs,
  opened,
  title,
  onLift,
  slideBox,
  onClose,
}: {
  photographs: GalleryMedia[];
  /** The photograph clicked and its box in the page; null while closed. */
  opened: {index: number; origin: Origin} | null;
  title: string;
  /** The slide whose photograph the gallery shows now: the page hides it. */
  onLift: (id: string) => void;
  /** Brings a photograph's slide into view and gives its box, for the photograph to fly back to. */
  slideBox: (id: string) => Origin | null;
  /** The gallery has closed: the page shows its photographs again. */
  onClose: () => void;
}) {
  const {t} = useTranslation();
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  // The screen and the area a photograph fits in, measured once the dialog is open.
  const [view, setView] = useState<{stage: Box; area: Box} | null>(null);
  const [openedNow, setOpenedNow] = useState(opened);
  // Each opening starts at the photograph clicked, not zoomed, and measures the screen again.
  if (opened !== openedNow) {
    setOpenedNow(opened);
    if (opened) {
      setIndex(Math.max(opened.index, 0));
      setZoomed(false);
      setView(null);
    }
  }

  const open = opened !== null;
  const total = photographs.length;
  const photo = photographs[index];
  const fit = view && photo ? fitIn(view, photo.previewImage) : null;
  const zoom = view && fit ? zoomIn(view.stage, fit) : null;

  const stageRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The opening that has flown in, and whether the gallery is flying back: each happens once.
  const arrivedRef = useRef<typeof opened>(null);
  const leavingRef = useRef(false);
  // A zoom in or out waiting for its layout: where the box then scrolls to, and the box the photograph flies from.
  const resizeRef = useRef<{scroll: {left: number; top: number}; from: Box} | null>(null);
  // The one finger of a swipe: where it went down. A second finger (a pinch) cancels the swipe.
  const touchRef = useRef<{x: number; id: number} | null>(null);
  const draggedRef = useRef(false);
  /** Whether a click only ends a swipe: it is taken once. A click from the keyboard (`detail` 0) never is. */
  const draggedClick = (event: {detail: number}) => {
    const dragged = event.detail !== 0 && draggedRef.current;
    draggedRef.current = false;
    return dragged;
  };

  // The dialog opens in its own effect, which runs before this one: the screen can be measured, and again when it
  // changes size.
  useEffect(() => {
    const stage = stageRef.current;
    const area = areaRef.current;
    if (!open || !stage || !area) return;
    const measure = () =>
      setView({stage: toBox(stage.getBoundingClientRect()), area: toBox(area.getBoundingClientRect())});
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [open]);

  // Once measured, the photograph clicked flies from its box in the page to its place, before the screen is painted;
  // the background and the buttons fade in with it.
  useLayoutEffect(() => {
    if (!opened || !view || !fit || !photo || arrivedRef.current === opened) return;
    arrivedRef.current = opened;
    leavingRef.current = false;
    onLift(photo.id);
    if (reducedMotion()) return;
    photoRef.current?.animate?.([{transform: between(opened.origin, onScreen(view.stage, fit))}, {transform: 'none'}], {
      duration: FLIGHT_MS,
      easing: FLIGHT_EASING,
    });
    for (const layer of [backRef.current, barRef.current]) {
      layer?.animate?.([{opacity: 0}, {opacity: 1}], {duration: FLIGHT_MS, easing: 'ease-out'});
    }
  }, [opened, view, fit, photo, onLift]);

  // A zoom in or out, once laid out: the box scrolls to the point asked for, and the photograph flies from its old box
  // to its new one, before the screen is painted.
  useLayoutEffect(() => {
    const resize = resizeRef.current;
    const box = scrollRef.current;
    if (!resize || !box || !view || !fit || !zoom) return;
    resizeRef.current = null;
    box.scrollLeft = resize.scroll.left;
    box.scrollTop = resize.scroll.top;
    if (reducedMotion()) return;
    const to = zoomed ? zoomedOnScreen(view.stage, zoom, resize.scroll) : onScreen(view.stage, fit);
    photoRef.current?.animate?.([{transform: between(resize.from, to)}, {transform: 'none'}], {
      duration: FLIGHT_MS,
      easing: FLIGHT_EASING,
    });
  }, [zoomed, view, fit, zoom]);

  /** The photograph's box on the screen now: whole, or zoomed and scrolled. */
  const shownBox = (): Box | null => {
    if (!view || !fit || !zoom) return null;
    const box = scrollRef.current;
    return zoomed && box
      ? zoomedOnScreen(view.stage, zoom, {left: box.scrollLeft, top: box.scrollTop})
      : onScreen(view.stage, fit);
  };

  /** Zooms in, the box scrolled so the point at `u`, `v` (0 to 1 across and down the screen) shows its own part. */
  const zoomInAt = (u: number, v: number) => {
    const from = shownBox();
    if (!from || !zoom) return;
    resizeRef.current = {scroll: {left: u * zoom.overflow.x, top: v * zoom.overflow.y}, from};
    setZoomed(true);
  };

  const zoomOut = () => {
    const from = shownBox();
    if (from) resizeRef.current = {scroll: {left: 0, top: 0}, from};
    setZoomed(false);
  };

  const finish = () => {
    leavingRef.current = false;
    onClose();
  };

  /** Flies the photograph shown back to its slide, the background fading, and closes; at once without the motion. */
  const leave = () => {
    if (leavingRef.current || !photo) return;
    leavingRef.current = true;
    const from = shownBox();
    const target = slideBox(photo.id);
    onLift(photo.id);
    const element = photoRef.current;
    if (!target || !from || !view || !element?.animate || reducedMotion() || !visible(target, view.stage)) {
      finish();
      return;
    }
    const flight = element.animate([{transform: 'none'}, {transform: between(target, from)}], {
      duration: FLIGHT_MS,
      easing: FLIGHT_EASING,
      fill: 'forwards',
    });
    for (const layer of [backRef.current, barRef.current]) {
      layer?.animate?.([{opacity: 1}, {opacity: 0}], {duration: FLIGHT_MS, easing: 'ease-in', fill: 'forwards'});
    }
    flight.finished.then(finish, finish);
  };

  const go = (next: number) => {
    setIndex((next + total) % total);
    setZoomed(false);
    resizeRef.current = null;
    scrollRef.current?.scrollTo?.(0, 0);
  };

  // The keyboard while it is open: Escape flies the photograph back (the browser would close the dialog at once); the
  // arrows move between the photographs, or scroll the zoomed one by a tenth. The latest handler, for the document's
  // listener.
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      leave();
      return;
    }
    const [across, down] = ARROWS[event.key] ?? [0, 0];
    if (!across && !down) return;
    const box = scrollRef.current;
    if (zoomed && box && zoom) {
      event.preventDefault();
      box.scrollLeft = Math.min(zoom.overflow.x, Math.max(0, box.scrollLeft + (across * zoom.overflow.x) / 10));
      box.scrollTop = Math.min(zoom.overflow.y, Math.max(0, box.scrollTop + (down * zoom.overflow.y) / 10));
    } else if (!zoomed && across && total > 1) go(index + across);
  };
  const keyRef = useRef(onKey);
  useLayoutEffect(() => {
    keyRef.current = onKey;
  });
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    document.addEventListener('keydown', (event) => keyRef.current(event), {signal: controller.signal});
    return () => controller.abort();
  }, [open]);

  /** Where the pointer is, 0 to 1 across and down the screen. */
  const pointAt = (x: number, y: number) =>
    view
      ? {u: clamp((x - view.stage.left) / view.stage.width), v: clamp((y - view.stage.top) / view.stage.height)}
      : {u: 0.5, v: 0.5};

  return (
    <Dialog variant="fullscreen" bare open={open} onClose={finish} heading={title} initialFocusRef={closeRef}>
      {open && photo && (
        // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-static-element-interactions -- a click beside the photograph is the pointer's way to zoom back or close; the keyboard's are the photograph's button, Escape and the close button
        <div
          ref={stageRef}
          onClick={(event) => {
            // A swipe that ends beside the photograph is not a click, nor is one on the photograph or a button.
            const target = event.target as Node;
            if (draggedClick(event) || photoRef.current?.contains(target) || barRef.current?.contains(target)) return;
            // Beside a zoomed photograph, a click goes back to the gallery, to look at the others; beside a whole one,
            // it closes.
            if (zoomed) zoomOut();
            else leave();
          }}
          onPointerMove={(event) => {
            // The mouse moves around the zoomed photograph: its edge at the screen's edge.
            const box = scrollRef.current;
            if (!zoomed || event.pointerType !== 'mouse' || !box || !zoom) return;
            const {u, v} = pointAt(event.clientX, event.clientY);
            box.scrollLeft = u * zoom.overflow.x;
            box.scrollTop = v * zoom.overflow.y;
          }}
          onPointerDown={(event) => {
            draggedRef.current = false;
            if (event.pointerType !== 'touch' || zoomed) return;
            touchRef.current = touchRef.current ? null : {x: event.clientX, id: event.pointerId};
          }}
          onPointerUp={(event) => {
            const start = touchRef.current;
            if (start?.id !== event.pointerId) return;
            touchRef.current = null;
            // A swipe moves between the photographs while one is not zoomed.
            if (zoomed || Math.abs(event.clientX - start.x) < 50) return;
            draggedRef.current = true;
            go(index + (event.clientX < start.x ? 1 : -1));
          }}
          onPointerCancel={() => {
            touchRef.current = null;
          }}
          className="relative min-h-0 w-full flex-1 overflow-hidden"
        >
          <div
            ref={backRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-background"
            // Nothing shows before the photograph is in place: the page stays visible until the flight starts.
            style={view ? undefined : {opacity: 0}}
          />
          <div
            ref={areaRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-8 bottom-24 md:inset-x-8"
          />
          {/* The box the zoomed photograph scrolls in, with the phone's own scrolling. Whole, it does not scroll: the
              browser keeps vertical pans and pinches and leaves the sideways move to the swipe (B-294). */}
          <div
            ref={scrollRef}
            className={`scrollbar-none absolute inset-0 overscroll-contain ${zoomed ? 'touch-pan-x touch-pan-y overflow-auto' : 'touch-pan-y touch-pinch-zoom overflow-hidden'}`}
          >
            {view && fit && zoom && (
              <div
                className="relative"
                style={zoomed ? zoom.sizer : {width: view.stage.width, height: view.stage.height}}
              >
                <button
                  key={photo.id}
                  ref={photoRef}
                  type="button"
                  aria-label={zoomed ? t('gallery.zoomOut') : t('gallery.zoom')}
                  aria-pressed={zoomed}
                  disabled={fit.zoom === 1}
                  onClick={(event) => {
                    if (draggedClick(event)) return;
                    if (zoomed) {
                      zoomOut();
                      return;
                    }
                    // A click from the keyboard (`detail` 0) has no position: it zooms into the middle.
                    const {u, v} = event.detail === 0 ? {u: 0.5, v: 0.5} : pointAt(event.clientX, event.clientY);
                    zoomInAt(u, v);
                  }}
                  className={`absolute focus-visible:-outline-offset-2 ${zoomed ? 'cursor-zoom-out' : fit.zoom > 1 ? 'cursor-zoom-in' : 'cursor-default'}`}
                  style={
                    zoomed
                      ? {left: zoom.left, top: zoom.top, width: zoom.width, height: zoom.height}
                      : {left: fit.left, top: fit.top, width: fit.width, height: fit.height}
                  }
                >
                  {/* The picture the page already shows, under the larger one until that has loaded. */}
                  {opened?.index === index && opened.origin.src && (
                    <img src={opened.origin.src} alt="" className="absolute inset-0 size-full object-contain" />
                  )}
                  <MediaFile
                    data={photo}
                    alt={title}
                    loading="eager"
                    // The width it shows at: its whole view, or its own size once zoomed.
                    sizes={`${Math.round(zoomed ? zoom.width : fit.width)}px`}
                    className="relative size-full object-contain"
                  />
                </button>
              </div>
            )}
          </div>
          {total > 1 && (
            <p aria-live="polite" className="sr-only">
              {t('gallery.position', {index: index + 1, total})}
            </p>
          )}
          {/* Only its buttons take the pointer: a click between them is a click beside the photograph. */}
          <div
            ref={barRef}
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 pb-6"
            style={view ? undefined : {opacity: 0}}
          >
            {total > 1 && (
              <RoundButton label={t('gallery.previous')} onClick={() => go(index - 1)}>
                <ChevronLeftIcon className="size-5" />
              </RoundButton>
            )}
            {/* From 750 px the larger button between previous and next; on a phone the X alone at the screen's top
                right, on a faint ground that keeps it clear over a zoomed photograph. */}
            <RoundButton
              ref={closeRef}
              large
              label={t('actions.close')}
              onClick={leave}
              className="max-md:fixed max-md:top-3 max-md:right-3 max-md:size-11 max-md:border-transparent max-md:bg-background/80 max-md:shadow-none max-md:backdrop-blur-glass"
            >
              <CloseIcon aria-hidden="true" className="size-6" />
            </RoundButton>
            {total > 1 && (
              <RoundButton label={t('gallery.next')} onClick={() => go(index + 1)}>
                <ChevronRightIcon className="size-5" />
              </RoundButton>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** The slides a phone's dots stand for: at most `MAX_DOTS`, around the current one, kept within the slides. */
function dotWindow(current: number, total: number): number[] {
  const count = Math.min(total, MAX_DOTS);
  const start = Math.min(Math.max(current - 1, 0), total - count);
  return Array.from({length: count}, (_, offset) => start + offset);
}

/** Whether the slideshow pages up and down (a phone) rather than across. */
function pagesDown(track: HTMLElement): boolean {
  return getComputedStyle(track).flexDirection === 'column';
}

/** The arrow keys as steps across and down. */
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** A photograph's visible box in its frame (`object-contain` leaves bands beside or above it), and its picture. */
function photoBox(frame: HTMLElement, image: GalleryMedia['previewImage']): Origin {
  const box = frame.getBoundingClientRect();
  const ratio = image?.width && image.height ? image.width / image.height : box.width / Math.max(box.height, 1);
  const width = Math.min(box.width, box.height * ratio);
  const height = width / ratio;
  const picture = frame.querySelector('img');
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
    src: picture?.currentSrc || picture?.src || '',
  };
}

/**
 * The photograph whole in the area, centred in it and never larger than its own size, in the stage's coordinates; and
 * how many times a click enlarges it: to its own size, at most `MAX_ZOOM`, and 1 — no zoom — below `MIN_ZOOM`.
 */
function fitIn({stage, area}: {stage: Box; area: Box}, image: GalleryMedia['previewImage']) {
  const own = image?.width && image.height ? {width: image.width, height: image.height} : null;
  const ratio = own ? own.width / own.height : 1;
  const width = Math.min(area.width, area.height * ratio, own?.width ?? Infinity);
  const height = width / ratio;
  const zoom = own ? Math.min(own.width / width, MAX_ZOOM) : UNKNOWN_ZOOM;
  return {
    left: area.left - stage.left + (area.width - width) / 2,
    top: area.top - stage.top + (area.height - height) / 2,
    width,
    height,
    zoom: zoom >= MIN_ZOOM ? zoom : 1,
  };
}

type Fit = ReturnType<typeof fitIn>;

/**
 * The zoomed photograph laid out at its own size in the scroll box: a sizer at least as large as the screen, the
 * photograph centred in it along a side that fits the screen, and how far the box scrolls each way.
 */
function zoomIn(stage: Box, fit: Fit) {
  const width = fit.width * fit.zoom;
  const height = fit.height * fit.zoom;
  const sizer = {width: Math.max(width, stage.width), height: Math.max(height, stage.height)};
  return {
    width,
    height,
    sizer,
    left: (sizer.width - width) / 2,
    top: (sizer.height - height) / 2,
    overflow: {x: sizer.width - stage.width, y: sizer.height - stage.height},
  };
}

type Zoom = ReturnType<typeof zoomIn>;

/** The zoomed photograph's box in the viewport's coordinates, with the box scrolled by `scroll`. */
function zoomedOnScreen(stage: Box, zoom: Zoom, scroll: {left: number; top: number}): Box {
  return {
    left: stage.left + zoom.left - scroll.left,
    top: stage.top + zoom.top - scroll.top,
    width: zoom.width,
    height: zoom.height,
  };
}

/** The photograph's place in the viewport's coordinates. */
function onScreen(stage: Box, fit: Fit): Box {
  return {left: stage.left + fit.left, top: stage.top + fit.top, width: fit.width, height: fit.height};
}

/** The transform that draws a box laid out at `to` over `from`: moved centre to centre and scaled by width. */
function between(from: Box, to: Box): string {
  const x = from.left + from.width / 2 - (to.left + to.width / 2);
  const y = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${x}px, ${y}px) scale(${from.width / to.width})`;
}

/** Whether a box is at least partly on the screen: a photograph flies back only to a slide in view. */
function visible(box: Box, stage: Box): boolean {
  return box.width > 0 && box.top + box.height > stage.top && box.top < stage.top + stage.height;
}

function toBox({left, top, width, height}: DOMRect): Box {
  return {left, top, width, height};
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
