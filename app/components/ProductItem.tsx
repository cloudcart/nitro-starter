import {type ReactNode, type RefObject, useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {AddToCartButton, cloudcartLoader, Image, KeptLink} from '@cloudcart/nitrogen-react';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {Badge} from '~/components/ui/Badge';
import {ChevronLeftIcon, ChevronRightIcon} from '~/components/ui/icons';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import {buttonClass, ButtonLink} from '~/components/ui/Button';
import {ADD_TO_CART_FETCHER_KEY} from '~/lib/cart';
import {quickAddOf} from '~/lib/quick-add';
import {noteProduct} from '~/lib/opening';
import {shownCompareAtPrice, useVariantUrl} from '~/lib/variants';
import {CardPrice} from './CardPrice';
import {useCardRating, useEveryCardRated} from './ReviewDisplay';
import {StarRating} from './StarRating';
import {StockStatus} from './StockStatus';
import {WishlistButton} from './WishlistButton';
import {ProductLabel} from '~/components/ProductLabel';
import {AddToCartOffers} from '~/components/AddToCartOffers';

type CardOption = ProductItemFragment['options'][number];
type CardValue = CardOption['optionValues'][number];
type CardImage = NonNullable<ProductItemFragment['featuredImage']>;

/** How many values a card shows of its swatch option; the rest is a count. */
const MAX_SWATCHES = 5;

/**
 * A product in a listing: its pictures in the card's frame (`aspect-card`, the same for every card), the badges, the
 * vendor, title, rating (as the merchant's settings say), price and stock; under it the values of one option to choose.
 * On a desktop, hovering the picture shows arrows through the product's pictures; on a phone they are swiped.
 * Pointing at a value shows its variant's picture, kept until another is pointed at, and points the link at it: the
 * product opens on the picture the card showed (B-491). Choosing one also prices the card and quick add at it.
 * Quick add, on a desktop, adds straight to the cart when there is nothing left to choose, otherwise it is a link to
 * the product to choose there.
 */
export function ProductItem({
  product,
  loading,
  priority = false,
  sizes = CARD_SIZES,
  titleAs: Title = 'h3',
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
  /** In a listing's first row: its picture is fetched before the page's others (`fetchPriority="high"`, T-598). */
  priority?: boolean;
  /** The picture's width in the page, when the card's column is not `CARD_SIZES`' (a listing's density). */
  sizes?: string;
  /** The title's element: a heading under its section's h2, or plain text where no heading belongs (B-448). */
  titleAs?: 'h3' | 'p';
}) {
  const {t} = useTranslation();
  const swatches = swatchOption(product);
  const [chosen, setChosen] = useState<CardValue | null>(null);
  const [pointed, setPointed] = useState<CardValue | null>(null);
  // The value whose picture the card shows: the last pointed at, which stays when the pointer moves on, or the chosen.
  const shown = pointed ?? chosen;
  const variant = chosen?.firstSelectableVariant ?? product.selectedOrFirstAvailableVariant;
  const variantUrl = useVariantUrl(
    product.handle,
    useMemo(() => (shown && swatches ? [{name: swatches.name, value: shown.name}] : undefined), [shown, swatches]),
  );
  // The store's own discount: its percentage, and whether the merchant hides the price before it.
  const {discount} = product;
  // The merchant's settings decide whether a card shows the rating (`ReviewDisplayProvider`).
  const showRating = useCardRating(product.reviewSummary);
  // The shown value's own picture lies over the product's pictures.
  const variantImage = shown?.firstSelectableVariant?.image ?? null;
  // The variant the link opens the page on: the shown value's, else the product's first available (B-491).
  const opened = shown?.firstSelectableVariant ?? product.selectedOrFirstAvailableVariant;
  const trackRef = useRef<HTMLDivElement>(null);
  const pictures = useCardPictures(product, trackRef);

  return (
    <div className="group relative" onPointerEnter={() => pictures.interested()}>
      <KeptLink
        className="block hover:no-underline"
        to={variantUrl}
        // Its page opens at once from what the card shows, while the page loads (T-571).
        onClick={(event) =>
          noteProduct(
            event.currentTarget,
            {
              title: product.title,
              vendor: product.vendor,
              image: variantImage ?? pictures.list[0] ?? null,
              pictures: pictures.list.length,
              price: opened?.price ?? null,
              compareAtPrice: shownCompareAtPrice(opened?.compareAtPrice, discount),
            },
            event.currentTarget.querySelector<HTMLImageElement>('img[data-card-opens]')?.currentSrc || undefined,
          )
        }
      >
        <div className="relative aspect-card overflow-hidden">
          <CardPictures
            pictures={pictures}
            trackRef={trackRef}
            loading={loading}
            priority={priority}
            over={variantImage}
            sizes={sizes}
          />
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {discount?.percent && (
              <Badge variant="highlight">{t('product.discountBadge', {percent: discount.percent})}</Badge>
            )}
            {product.labels.map((label) => (
              <ProductLabel key={label.name} label={label} />
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          {product.vendor && <p className="text-small text-muted">{product.vendor}</p>}
          <Title className="text-body font-medium">{product.title}</Title>
          {showRating && product.reviewSummary && (
            <StarRating rating={product.reviewSummary.averageRating} count={product.reviewSummary.totalCount} />
          )}
          {/* A chosen value prices the card at its variant; otherwise prices that differ read "From" the lowest. */}
          <p>
            <CardPrice priceRange={product.priceRange} variant={variant} discount={discount} fixed={Boolean(chosen)} />
          </p>
          {/* The variant the card shows, as its product page says it — a sold-out one too, its dot grey (B-380). */}
          <StockStatus variant={variant} className="mt-1" />
        </div>
      </KeptLink>
      {swatches && (
        <Swatches
          option={swatches}
          chosen={chosen}
          onPoint={setPointed}
          onChoose={(value) => setChosen(value === chosen ? null : value)}
        />
      )}
      {/* Over the picture, outside the link: a button in a link is not allowed. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-card">
        {/* Over a pointed value's picture the arrows go back to the product's pictures. */}
        {!chosen && <CardArrows pictures={pictures} onMove={() => setPointed(null)} />}
        <div className="pointer-events-auto absolute top-2 left-2">
          <WishlistButton productId={product.id} />
        </div>
        <QuickAdd product={product} variant={variant} chosenOption={chosen ? swatches : null} productUrl={variantUrl} />
      </div>
    </div>
  );
}

/**
 * A card's place while its product loads, as tall as a row of cards mostly is (B-436), so the section does not grow
 * when the products arrive (B-323): the picture's box, the title's two lines (a row's longest title wraps), the rating's
 * row when every card shows one, the price's and the stock's. A vendor and swatches come with some products only.
 */
export function ProductItemPlaceholder() {
  const rated = useEveryCardRated();
  return (
    <div aria-hidden="true">
      <div className="aspect-card bg-surface" />
      <div className="mt-3 flex flex-col gap-1 text-body">
        <span className="h-[2lh] w-3/4 bg-surface" />
        {rated && <span className="h-lh w-1/3 bg-surface text-small" />}
        <span className="h-lh w-1/3 bg-surface" />
        <span className="mt-1 h-lh w-1/4 bg-surface text-small" />
      </div>
    </div>
  );
}

/**
 * The option a card offers to choose from: one shown as colours or pictures, else the first whose values lead to
 * variants with pictures of their own, shown as words (Q-37). None for a product with nothing to choose.
 */
function swatchOption(product: ProductItemFragment): CardOption | null {
  const choosable = product.options.filter((option) => option.optionValues.length > 1);
  return (
    choosable.find((option) => option.type === 'color' || option.type === 'image') ??
    choosable.find((option) => option.optionValues.filter((value) => value.firstSelectableVariant?.image).length > 1) ??
    null
  );
}

/**
 * A card's pictures and where the visitor is among them. A picture past the first is fetched once the visitor shows
 * interest (a hover, a swipe), one ahead of the one shown.
 */
function useCardPictures(product: ProductItemFragment, trackRef: RefObject<HTMLDivElement | null>) {
  const [current, setCurrent] = useState(0);
  // The furthest picture to fetch.
  const [reach, setReach] = useState(0);
  // The page opens on its first available variant's picture: the card starts with the same one (B-240), then the
  // product's other pictures.
  const first = product.selectedOrFirstAvailableVariant?.image ?? null;
  const pictures: CardImage[] = product.images.nodes.length
    ? product.images.nodes
    : product.featuredImage
      ? [product.featuredImage]
      : [];
  const list = first ? [first, ...pictures.filter((image) => image.url !== first.url)] : pictures;
  const total = list.length;

  return {
    list,
    current,
    reach,
    interested: (index = current) => setReach((value) => Math.max(value, Math.min(index + 1, total - 1))),
    /** The track scrolled, by a swipe or an arrow. */
    moved: (index: number) => {
      setCurrent(index);
      setReach((value) => Math.max(value, Math.min(index + 1, total - 1)));
    },
    go: (index: number) => {
      const track = trackRef.current;
      if (track) track.scrollTo({left: index * track.clientWidth});
    },
  };
}

type CardPicturesState = ReturnType<typeof useCardPictures>;

/**
 * The width of the thumbnail a slide shows until its own picture loads: a few kilobytes, and sharp enough at a card's
 * width to read as the picture. The image CDN makes any width on request.
 */
const THUMBNAIL_WIDTH = 200;

/**
 * The product's pictures in the card's frame, one at a time, swiped on a phone. `over`, a variant's picture, lies
 * over them while it is pointed at or chosen. Once the card's own picture has loaded, the next one's thumbnail is
 * fetched behind it, and the one after the shown one's as the visitor moves: a picture swiped to shows at once, a
 * little soft, until its own loads (T-593).
 */
function CardPictures({
  pictures,
  trackRef,
  loading,
  priority,
  over,
  sizes,
}: {
  pictures: CardPicturesState;
  trackRef: RefObject<HTMLDivElement | null>;
  loading?: 'eager' | 'lazy';
  priority: boolean;
  over: CardImage | null;
  sizes: string;
}) {
  // The card's own picture has loaded — before the page was interactive too, when no `load` is left to hear.
  const [shown, setShown] = useState(false);
  const firstRef = useCallback((picture: HTMLImageElement | null) => {
    if (picture?.complete && picture.naturalWidth > 0) setShown(true);
  }, []);

  if (!pictures.list.length) return <ImagePlaceholder />;

  return (
    <>
      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          pictures.moved(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)));
        }}
        className="scrollbar-none flex size-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {pictures.list.map((image, index) => (
          <CardSlide key={image.url} thumbnail={shown && index > 0 && index <= pictures.current + 1 ? image : null}>
            {index <= pictures.reach && (
              <Image
                ref={index === 0 ? firstRef : undefined}
                onLoad={index === 0 ? () => setShown(true) : undefined}
                // The title is in the same link: the picture adds nothing for a screen reader (B-211).
                alt=""
                data={image}
                // The picture the product page opens on (`noteProduct`), unless a value's picture lies over it.
                data-card-opens={(index === 0 && !over) || undefined}
                // Past the first, a picture is here only once it is wanted, one ahead of the one shown: fetched now,
                // not when it is scrolled into view, so the arrow shows it loaded (B-492).
                loading={index === 0 ? loading : 'eager'}
                fetchPriority={index === 0 && priority ? 'high' : undefined}
                sizes={sizes}
                className="size-full object-contain"
              />
            )}
          </CardSlide>
        ))}
      </div>
      {over && (
        <Image
          alt=""
          data={over}
          sizes={sizes}
          data-card-opens
          className="absolute inset-0 size-full bg-background object-contain"
        />
      )}
    </>
  );
}

/**
 * One of a card's slides: its thumbnail, when it has one, under its picture until the picture loads — then gone, so a
 * picture with a transparent ground does not show it through (as the product page's gallery, T-573).
 */
function CardSlide({thumbnail, children}: {thumbnail: CardImage | null; children: ReactNode}) {
  const [loaded, setLoaded] = useState(false);
  const backdrop = thumbnail && !loaded ? cloudcartLoader({src: thumbnail.url, width: THUMBNAIL_WIDTH}) : null;
  return (
    <div
      onLoad={() => setLoaded(true)}
      style={backdrop ? {backgroundImage: `url(${JSON.stringify(backdrop)})`} : undefined}
      className="size-full shrink-0 snap-center bg-contain bg-center bg-no-repeat"
    >
      {children}
    </div>
  );
}

/**
 * Arrows through a card's pictures, on a desktop while the card is hovered or an arrow has focus: bare chevrons that
 * invert the colour under them, legible on light and dark pictures (Q-36). Their focus ring inverts too: an accent ring
 * under the blend would vanish where the accent is black (B-318).
 */
function CardArrows({pictures, onMove}: {pictures: CardPicturesState; onMove: () => void}) {
  const {t} = useTranslation();
  const {current, list} = pictures;
  if (list.length < 2) return null;

  const arrow =
    'pointer-events-auto absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center text-difference opacity-0 mix-blend-difference transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-difference disabled:invisible lg:grid';
  return (
    <>
      <button
        type="button"
        aria-label={t('gallery.previous')}
        disabled={current === 0}
        onClick={() => {
          onMove();
          pictures.go(current - 1);
        }}
        className={`${arrow} left-0`}
      >
        <ChevronLeftIcon className="size-8" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        aria-label={t('gallery.next')}
        disabled={current === list.length - 1}
        onClick={() => {
          onMove();
          pictures.go(current + 1);
        }}
        className={`${arrow} right-0`}
      >
        <ChevronRightIcon className="size-8" strokeWidth={2.25} />
      </button>
    </>
  );
}

/**
 * A card picture's width in the page, for the browser to pick its size: a grid of two, three and four columns
 * (`PRODUCT_GRID_CLASSES`) with 1rem gaps in the page box (90rem, gutters of 2.5rem from 750 px and 1.25rem below).
 * A card in another grid passes its own.
 */
const CARD_SIZES =
  '(min-width: 1440px) 328px, (min-width: 990px) calc(25vw - 32px), (min-width: 750px) calc(33.34vw - 37px), calc(50vw - 28px)';

/**
 * One option's values under a card: colours or pictures when the store shows the option that way, words otherwise.
 * Pointing at a value shows its variant's picture until another is pointed at; choosing one selects it for the card,
 * choosing it again lets go.
 */
function Swatches({
  option,
  chosen,
  onPoint,
  onChoose,
}: {
  option: CardOption;
  chosen: CardValue | null;
  onPoint: (value: CardValue) => void;
  onChoose: (value: CardValue) => void;
}) {
  const shown = option.optionValues.slice(0, MAX_SWATCHES);
  const more = option.optionValues.length - shown.length;

  return (
    <ul aria-label={option.name} className="mt-2 flex flex-wrap items-center gap-1.5">
      {shown.map((value) => {
        const {color, image} = value.swatch ?? {};
        const picture = image?.previewImage.url;
        const pressed = value === chosen;
        return (
          <li key={value.name}>
            <button
              type="button"
              aria-label={color || picture ? value.name : undefined}
              aria-pressed={pressed}
              title={value.name}
              // No reset on leaving: between two swatches the card keeps the last picture, not the product's (B-491).
              onPointerEnter={() => onPoint(value)}
              onFocus={() => onPoint(value)}
              onClick={() => onChoose(value)}
              className={
                color || picture
                  ? `block size-6 overflow-hidden rounded-full border ring-offset-2 ring-offset-background transition-shadow ${pressed ? 'border-accent ring-1 ring-accent' : 'border-control hover:ring-1 hover:ring-control'}`
                  : `h-7 rounded-full border px-2.5 text-small transition-colors ${pressed ? 'border-accent bg-accent text-accent-foreground' : 'border-border hover:border-foreground'}`
              }
              style={color ? {backgroundColor: color} : undefined}
            >
              {/* The picture at the dot's size from the image CDN, as the product page's swatches (B-392). */}
              {picture && !color ? (
                <Image src={picture} alt="" width={24} aspectRatio="1/1" className="size-full object-cover" />
              ) : color ? null : (
                value.name
              )}
            </button>
          </li>
        );
      })}
      {more > 0 && <li className="text-small text-muted">+{more}</li>}
    </ul>
  );
}

/**
 * Quick add, from the large breakpoint, shown while the card is hovered or holds the keyboard's focus — not a click's:
 * a swatch clicked keeps the focus, and the button would stay over the picture after the pointer left (B-237). It
 * stays out of the way of a touch: hidden, it takes no taps. A sold-out product gets none.
 */
function QuickAdd({
  product,
  variant,
  chosenOption,
  productUrl,
}: {
  product: ProductItemFragment;
  /** The variant the card shows: the one a chosen value leads to, or the product's first available. */
  variant: ProductItemFragment['selectedOrFirstAvailableVariant'];
  /** The option whose value the visitor chose on the card: chosen already. */
  chosenOption: CardOption | null;
  productUrl: string;
}) {
  const {t} = useTranslation();
  // This card asked: its add's answer — the store's up-sell, a cross-sell, the cart — is this card's to show.
  const [asked, setAsked] = useState(false);
  if (!product.availableForSale || !variant?.availableForSale) return null;

  // A bundle or a second value to choose: chosen on the product's page.
  const {needsChoice, line} = quickAddOf(product, variant, chosenOption?.name);

  return (
    <>
      <div className="absolute inset-x-2 bottom-2 hidden opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-has-focus-visible:pointer-events-auto group-has-focus-visible:opacity-100 lg:block">
        {needsChoice ? (
          <ButtonLink to={productUrl} prefetch="intent" variant="inverse" fullWidth>
            {t('product.chooseOptions')}
          </ButtonLink>
        ) : (
          <AddToCartButton
            className={buttonClass('primary', {fullWidth: true})}
            onClick={() => setAsked(true)}
            fetcherKey={ADD_TO_CART_FETCHER_KEY}
            // The store's up-sell first, as the platform's listings ask it (B-213); the cart says why an add was refused.
            upSell="check"
            showErrors={false}
            lines={[line]}
          >
            {t('product.addToCart')}
          </AddToCartButton>
        )}
      </div>
      {/* Outside the hover layer, which takes no pointer: a dialog inherits that, even shown over the page. */}
      {asked && (
        <div className="pointer-events-auto">
          <AddToCartOffers
            fetcherKey={ADD_TO_CART_FETCHER_KEY}
            line={line}
            refusals="cart"
            onSettled={() => setAsked(false)}
          />
        </div>
      )}
    </>
  );
}
