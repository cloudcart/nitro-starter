import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useFetcher, useNavigate, useRouteLoaderData} from 'react-router';
import {type MappedProductOptions, useTranslation} from '@cloudcart/nitrogen';
import {AddToCartButton, Image, useAddToCart} from '@cloudcart/nitrogen-react';
import type {ProductFragment} from 'storefrontapi.generated';
import {AddToCartOffers} from '~/components/AddToCartOffers';
import {
  type CustomizationAnswers,
  isAnswered,
  missingCustomizations,
  ProductCustomizations,
} from '~/components/ProductCustomizations';
import {ProductOptions, shownOptions} from '~/components/ProductOptions';
import {type PieceVariant, QuantityTiers} from '~/components/QuantityTiers';
import {Button, buttonClass} from '~/components/ui/Button';
import {Price} from '~/components/ui/Price';
import {StockStatus} from '~/components/StockStatus';
import {QuantityStepper} from '~/components/ui/QuantityStepper';
import {STICKY_BAR, STICKY_BAR_ROW} from '~/components/ui/StickyBar';
import type {action as cartAction} from '~/routes/cart';
import type {loader as tierPiecesLoader} from '~/routes/tier-pieces';
import {
  cardPieces,
  choosePiece,
  choosesInTiers,
  formQuantity,
  type PieceChoice,
  piecesByVariant,
  piecesFigures,
  piecesNeedSum,
  tierChoices,
  tierPieces,
  tiersPending,
} from '~/lib/quantity-tiers';
import {shownCompareAtPrice} from '~/lib/variants';
import {scrollBehavior} from '~/lib/motion';
import type {RootLoader} from '~/root';
import {BELOW_MD} from '~/lib/breakpoints';

type Variant = NonNullable<ProductFragment['selectedOrFirstAvailableVariant']>;

/**
 * Choosing the variant, the quantity and the product's customizations, and adding the line to the cart. The add
 * asks for the store's up-sell first: with one, the buyer takes the offer or keeps the variant chosen. The cart
 * opens once the line is in, unless the store answers with a cross-sell, which shows first. A refusal shows under
 * the button. While the button is out of reach, a bar at the bottom of the screen offers the add; on a phone the page's
 * own buy row is hidden meanwhile, so the two are never seen together. On a product with variants and quantity tiers,
 * one piece is chosen by the option buttons; more pieces in the chosen tier's card, piece by piece, piece #1 being the
 * page's (T-545, T-547, Q-57): the buttons fold away, and the add sends a line a variant, with its pieces; the store's
 * up-sell is asked only of a single line.
 */
export function ProductForm({
  product,
  productOptions,
  selectedVariant,
  quantity,
  onQuantityChange,
  pieces,
  onPiecesChange,
  onPieceShown,
}: {
  product: Pick<
    ProductFragment,
    'id' | 'handle' | 'title' | 'customizations' | 'discount' | 'selectedOrFirstAvailableVariant' | 'adjacentVariants'
  >;
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  /** The quantity chosen, which the page keeps: the fast order sends it too (B-209). */
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  /** The variants chosen for the pieces of a tier, which the page keeps: fast order takes one variant (T-545, T-547). */
  pieces: PieceChoice;
  onPiecesChange: (pieces: PieceChoice) => void;
  /** Shows a piece's variant in the gallery when the buyer chooses it (the user, T-545). */
  onPieceShown?: (variant: PieceVariant) => void;
}) {
  const {t} = useTranslation();
  const [answers, setAnswers] = useState<CustomizationAnswers>({});
  const formRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buyRow, setBuyRow] = useState<HTMLDivElement | null>(null);
  const bar = useBarForRow(buyRow);
  // The page's button, its sticky bar and the declined up-sell's add share one fetcher: one state and one answer.
  const addKey = `product-add-${product.id}`;
  const {add, fetcher: adding} = useAddToCart<typeof cartAction>({fetcherKey: addKey});

  const missing = missingCustomizations(product.customizations, answers);
  const canBuy = Boolean(selectedVariant?.availableForSale);
  // The product's variants with their tiers, loaded once the cards hold the variant, and the store's money format:
  // pieces of several go past one's stock (B-370), and a card sums their prices (Q-58).
  const {variants, format} = usePieceVariants(product.handle, choosesInTiers(product, productOptions, selectedVariant));
  const {minimum, maximum, amount} = formQuantity(product, productOptions, selectedVariant, quantity, variants);
  const line = selectedVariant && {
    merchandiseId: selectedVariant.id,
    quantity: amount,
    customizations: Object.values(answers).filter(isAnswered),
    // What the cart shows of the line until the store's cart comes back (`useOptimisticCart`; B-244).
    selectedVariant,
  };
  const navigate = useNavigate();
  const choices = tierChoices(product, productOptions, selectedVariant, variants);
  const pieceIds = tierPieces(product, productOptions, selectedVariant, quantity, pieces, variants);
  const mixed = Boolean(selectedVariant && pieceIds?.some((id) => id !== selectedVariant.id));
  // One piece is chosen as on a product without tiers, by the option buttons; more pieces in the card (Q-57: B).
  const optionButtons = !pieceIds || pieceIds.length < 2;
  // A line a variant of the pieces, each shown by its own variant until the store's cart comes back.
  const lines =
    line && mixed && pieceIds
      ? piecesByVariant(pieceIds).map(([id, count]) => ({
          ...line,
          merchandiseId: id,
          quantity: count,
          selectedVariant: variants?.find((variant) => variant.id === id) ?? selectedVariant,
        }))
      : line
        ? [line]
        : [];

  return (
    <div ref={formRef} className="flex flex-col gap-6">
      {/* With more than one piece the variants are chosen in the card: the buttons fold away, as a card opens. The
          fold holds the gap after it and room for the buttons' focus ring: folded, it leaves nothing (B-373). */}
      {shownOptions(productOptions).length > 0 && (
        <div
          data-open={optionButtons || undefined}
          className="-mb-6 grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-linear data-open:grid-rows-[1fr]"
        >
          <div className="-mx-1 min-h-0 overflow-hidden px-1" inert={!optionButtons || undefined}>
            <div className="flex flex-col gap-6 pb-6">
              <ProductOptions options={productOptions} />
            </div>
          </div>
        </div>
      )}
      <ProductCustomizations
        customizations={product.customizations}
        answers={answers}
        onChange={(next) => setAnswers((current) => ({...current, [next.customizationId]: next}))}
      />
      {canBuy && line && (
        <QuantityTiers
          choices={choices}
          variant={{
            price: selectedVariant.price,
            compareAtPrice: shownCompareAtPrice(selectedVariant.compareAtPrice, product.discount),
          }}
          quantity={amount}
          minimum={minimum}
          onChange={onQuantityChange}
          pending={tiersPending(product, pieceIds?.[0] ?? selectedVariant.id)}
          pieces={
            pieceIds && {
              ids: pieceIds,
              piecesOf: (min) => cardPieces(pieces, selectedVariant.id, min, variants),
              options: productOptions,
              current: selectedVariant,
              variants,
              // A card's own figures are the loaded variant's tier at its least; other pieces are summed (Q-58).
              figuresOf: (ids, least) =>
                piecesNeedSum(ids, least, product.selectedOrFirstAvailableVariant?.id ?? '')
                  ? piecesFigures(ids, variants, format, (variant) =>
                      shownCompareAtPrice(variant.compareAtPrice, product.discount),
                    )
                  : null,
              onChange: (index, variant) => {
                if (index === 0) {
                  // Piece #1 is the page's variant: the page goes to it, as an option button does — with no request
                  // when the page has it whole (the loaded variant or a neighbour, T-597).
                  const options = variant.selectedOptions.map(({name, value}) => [name, value]);
                  const whole = [product.selectedOrFirstAvailableVariant, ...product.adjacentVariants].some(
                    (known) => known?.id === variant.id,
                  );
                  void navigate(`?${new URLSearchParams(options)}`, {
                    replace: true,
                    preventScrollReset: true,
                    ...(whole && {defaultShouldRevalidate: false}),
                  });
                } else {
                  onPiecesChange(choosePiece(pieces, index, variant.id));
                }
                onPieceShown?.(variant);
              },
            }
          }
        />
      )}
      <StockStatus variant={selectedVariant} />

      {canBuy && line && (
        <div className="flex flex-col gap-2">
          {/* While the bar stands in for it on a phone, the row is hidden — unless the visitor is typing its quantity. It
              fades while its page is swiped across, and comes once a page swiped to is in (`SwipeablePage`). */}
          <div
            ref={setBuyRow}
            data-swipe-hidden
            className={`flex items-stretch gap-3 transition-opacity ${bar.shown ? 'max-md:not-has-[input:focus]:invisible' : ''}`}
          >
            <QuantityStepper value={amount} min={minimum} max={maximum} onChange={onQuantityChange} />
            {/* The store's up-sell is asked first; its answer is read below, through the shared fetcher. */}
            <AddToCartButton
              ref={buttonRef}
              lines={lines}
              upSell="check"
              fetcherKey={addKey}
              disabled={missing.length > 0}
              showErrors={false}
              className={`${buttonClass('primary')} flex-1`}
              classNames={{root: 'flex flex-1'}}
            >
              {t('product.addToCart')}
            </AddToCartButton>
          </div>
          {missing.length > 0 && (
            <p className="text-small text-muted">
              {t('product.requiredMissing', {
                names: missing.map((customization) => customization.label).join(t('format.list')),
              })}
            </p>
          )}
          {/* The store's answer: its up-sell, the cart or its cross-sell, or why it refused the add (B-213). */}
          <AddToCartOffers fetcherKey={addKey} line={lines.length === 1 ? lines[0] : null} refusals="here" />
        </div>
      )}

      {canBuy && selectedVariant && (
        <StickyAddToCart
          title={product.title}
          variant={selectedVariant}
          compareAtPrice={shownCompareAtPrice(selectedVariant.compareAtPrice, product.discount)}
          shown={bar.shown}
          inPlace={bar.inPlace}
          quantity={line ? {value: amount, min: minimum, max: maximum, onChange: onQuantityChange} : null}
          busy={adding.state === 'submitting'}
          onAdd={() => {
            // With something left to choose, the bar takes the buyer to the form; otherwise it adds.
            if (missing.length > 0 || !line) {
              formRef.current?.scrollIntoView({behavior: scrollBehavior(), block: 'start'});
              buttonRef.current?.focus({preventScroll: true});
            } else {
              add(lines, {upSell: 'check'});
            }
          }}
          needsChoice={missing.length > 0}
        />
      )}
    </div>
  );
}

/** The fetcher that loads a product's variants for the tier cards; one for the whole page. */
const piecesFetcherKey = (handle: string) => `tier-pieces-${handle}`;

/**
 * The product's variants for the tier cards' selects, with their tiers' per-piece prices (`tier-pieces`), loaded once,
 * the first time `load` is set, null before; one request, read by the form and the page. The store's money format
 * comes with them, from the root's shop data (B-416).
 */
export function usePieceVariants(handle: string, load = false) {
  const fetcher = useFetcher<typeof tierPiecesLoader>({key: piecesFetcherKey(handle)});
  const loadPieces = fetcher.load;
  // Asked once: an effect run again asks nothing; the page mounts afresh for another product.
  const askedRef = useRef(false);
  useEffect(() => {
    if (!load || askedRef.current) return;
    askedRef.current = true;
    void loadPieces(`/tier-pieces?${new URLSearchParams({handle})}`);
  }, [load, handle, loadPieces]);
  const format = useRouteLoaderData<RootLoader>('root')?.header.shop.currencyFormat ?? null;
  return {variants: fetcher.data?.variants ?? null, format};
}

/** A phone: below the theme's `md`. */
const PHONE = BELOW_MD;

/**
 * The room a phone's buy row needs below it to be used where it stands (the user, B-357): the bar's row stands as high
 * (`pb-2.5`), so the two trade places on the same spot.
 */
const EDGE_PX = 10;

/**
 * Whether the bar stands in for the page's buy row: on a phone while the row is not wholly on the screen with
 * `EDGE_PX` below it; from 750 px once it has scrolled up out of view, not before the visitor reaches it. Read up and
 * down only, so a swipe moving the page sideways (`SwipeablePage`) changes nothing. `inPlace`: the change comes with
 * the row at the screen's bottom edge, where the bar's row stands, so one takes the other's place at once; otherwise
 * the bar slides.
 */
function useBarForRow(row: HTMLElement | null) {
  const [bar, setBar] = useState({shown: false, inPlace: false});
  useLayoutEffect(() => {
    if (!row || typeof IntersectionObserver === 'undefined') return;
    const update = (rect: DOMRectReadOnly, bottom: number, settled: boolean) => {
      const phone = typeof window.matchMedia === 'function' && window.matchMedia(PHONE).matches;
      const shown = phone ? rect.top < 0 || rect.bottom > bottom : rect.bottom <= 0;
      const inPlace = settled && phone && rect.top < bottom + EDGE_PX && rect.bottom > bottom - rect.height;
      setBar((current) => (current.shown === shown ? current : {shown, inPlace}));
    };
    // Before the first paint: a page opened with its row out of reach shows the bar coming up, never the row first.
    update(row.getBoundingClientRect(), window.innerHeight - EDGE_PX, false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) update(entry.boundingClientRect, entry.rootBounds?.bottom ?? window.innerHeight - EDGE_PX, true);
      },
      {threshold: [0, 1], rootMargin: `0px 0px -${EDGE_PX}px 0px`},
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [row]);
  return bar;
}

/**
 * The add button kept on the screen. From 750 px a bar along the bottom once the button has scrolled up out of view:
 * the variant's image, the product's title and price, and the add button, or "Choose options" when the form asks for
 * more. On a phone the page's own buy row — the quantity when the page shows it, and the button — in its place at the
 * bottom while the row is out of reach (`useBarForRow`), on the page's white fading upward into what lies behind it.
 */
function StickyAddToCart({
  title,
  variant,
  compareAtPrice,
  shown,
  inPlace,
  quantity,
  busy,
  needsChoice,
  onAdd,
}: {
  title: string;
  variant: Variant;
  /** The price before the discount, when the merchant shows it. */
  compareAtPrice: Variant['compareAtPrice'];
  shown: boolean;
  /** It takes the page's row's place, or gives it back, where the row stands: no slide. */
  inPlace: boolean;
  /** The page's quantity, when its form shows one: the phone's bar changes it too. */
  quantity: {value: number; min: number; max?: number; onChange: (value: number) => void} | null;
  /** The add is on its way (the form's button and this one share it). */
  busy: boolean;
  needsChoice: boolean;
  onAdd: () => void;
}) {
  const {t} = useTranslation();
  return (
    <div
      hidden={!shown}
      data-in-place={inPlace || undefined}
      // A phone's fade lets taps through to the page: only the row takes them.
      className={`${STICKY_BAR} data-in-place:transition-none`}
      data-sticky-add-to-cart
      // Gone while its page is swiped across, and on a neighbour's page coming in; it comes once the page is in.
      data-swipe-hidden
    >
      <div className={STICKY_BAR_ROW}>
        {variant.image && (
          <Image
            data={variant.image}
            alt=""
            width={48}
            sizes="48px"
            className="hidden aspect-square w-12 object-contain md:block"
          />
        )}
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate font-medium">{title}</p>
          <Price price={variant.price} compareAtPrice={compareAtPrice} className="text-small" />
        </div>
        {quantity && (
          <QuantityStepper
            value={quantity.value}
            min={quantity.min}
            max={quantity.max}
            onChange={quantity.onChange}
            className="md:hidden"
          />
        )}
        <Button loading={busy} onClick={onAdd} className="max-md:flex-1">
          {needsChoice ? t('product.chooseOptions') : t('product.addToCart')}
        </Button>
      </div>
    </div>
  );
}
