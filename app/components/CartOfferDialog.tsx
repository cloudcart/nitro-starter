import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  type CartApiCrossSellOffer,
  type CartApiNextOffer,
  type CartApiUpSellOffer,
  type OptimisticCartLineInput,
  useTranslation,
} from '@cloudcart/nitrogen';
import {AddToCartButton, Image, Money, RichText} from '@cloudcart/nitrogen-react';
import {CartActionMessages} from '~/components/CartActionMessages';
import {Dialog} from '~/components/Dialog';
import {Button, buttonClass} from '~/components/ui/Button';
import {Countdown} from '~/components/ui/Countdown';
import {Select} from '~/components/ui/Field';
import {Price} from '~/components/ui/Price';

/** An offer the store shows: a cross-sell, an up-sell, or one of the offers that follow them. */
export type ShownOffer = CartApiCrossSellOffer | CartApiUpSellOffer | CartApiNextOffer;

/** Where an offer's view and dismissal are counted, and an `ADD_TO_CART` offer applied (`routes/cart.offer.tsx`). */
export const OFFER_ROUTE = '/cart/offer';

/** An up-sell, first or next. */
type UpSell = CartApiUpSellOffer | Extract<CartApiNextOffer, {__typename: 'UpSellOffer'}>;

const isUpSell = (offer: ShownOffer): offer is UpSell => 'offerVariant' in offer;

/** Whether `OfferAnswer` shows an offer a cart change answered with. */
export function showsOfferAnswer(offer: CartApiCrossSellOffer | null | undefined): offer is CartApiCrossSellOffer {
  return Boolean(offer && (offer.display === 'POPUP' || offer.showAddedProducts));
}

/**
 * The cross-sell a cart change answered with (`crossSellOffer`): a `POPUP` one to choose from, or the products an
 * `ADD_TO_CART` one already put in the cart, when the merchant shows them. Nothing otherwise.
 */
export function OfferAnswer({offer, onClose}: {offer: CartApiCrossSellOffer | null | undefined; onClose?: () => void}) {
  const [closed, setClosed] = useState<CartApiCrossSellOffer | null>(null);
  if (!showsOfferAnswer(offer) || closed === offer) return null;

  return (
    <CartOfferDialog
      offer={offer}
      added={offer.display === 'ADD_TO_CART'}
      onClose={() => {
        setClosed(offer);
        onClose?.();
      }}
    />
  );
}

/**
 * The store's offer, in the merchant's colours: the title, the text, a countdown to its end, and its products —
 * each added on its own with the offer's button, at the offer's price — or, for an up-sell, the variant offered
 * instead of the one chosen. The view is counted when an offer shows, a decline as a dismissal; after a decline
 * the merchant's next offer shows, and after an add "Continue" leads to the one for takers, or to the cross-sell
 * the add answered with. With no next offer the dialog closes. `added` shows an `ADD_TO_CART` offer's products,
 * already in the cart.
 */
export function CartOfferDialog({
  offer: first,
  added: firstAdded = false,
  onClose,
  onDecline,
}: {
  offer: ShownOffer;
  /** The offer's products are already in the cart: shown, not offered. */
  added?: boolean;
  /** Called as the dialog closes; `took` says whether anything was added through it. */
  onClose: (result: {took: boolean}) => void;
  /** Called when the buyer declines the first offer: the product page then adds the variant the buyer chose. */
  onDecline?: () => void;
}) {
  const {t} = useTranslation();
  const [shown, setShown] = useState<{offer: ShownOffer; added: boolean}>({offer: first, added: firstAdded});
  const {offer, added} = shown;
  const [open, setOpen] = useState(true);
  const [taken, setTaken] = useState(false);
  // Whether anything went into the cart through the dialog, and the cross-sell the last add answered with.
  const tookRef = useRef(false);
  const [answered, setAnswered] = useState<CartApiCrossSellOffer | null>(null);
  const dismissal = useFetcher();

  const close = () => {
    setOpen(false);
    onClose({took: tookRef.current});
  };
  const show = (next: ShownOffer | null | undefined, nextAdded = false) => {
    if (!next) return close();
    setTaken(false);
    setAnswered(null);
    setShown({offer: next, added: nextAdded});
  };
  const decline = () => {
    void dismissal.submit(
      {intent: 'dismissed', offerId: offer.id},
      {method: 'post', action: OFFER_ROUTE, defaultShouldRevalidate: false},
    );
    if (offer === first) onDecline?.();
    show('nextIfDeclined' in offer ? offer.nextIfDeclined : null);
  };
  const proceed = () => {
    if (added) return close();
    const next = 'nextIfAccepted' in offer ? offer.nextIfAccepted : null;
    if (next) return show(next);
    if (showsOfferAnswer(answered)) return show(answered, answered.display === 'ADD_TO_CART');
    close();
  };
  const onAdded = (data: unknown) => {
    tookRef.current = true;
    setTaken(true);
    setAnswered((data as {crossSellOffer?: CartApiCrossSellOffer | null} | null)?.crossSellOffer ?? null);
  };
  const {colors} = offer;
  const endsAt = 'endsAt' in offer ? offer.endsAt : null;
  const accept = {backgroundColor: colors.buttonBackground ?? undefined, color: colors.buttonText ?? undefined};

  return (
    <Dialog
      variant="modal"
      open={open}
      onClose={close}
      heading={offer.title || (added ? t('cart.offer.addedTitle') : t('cart.offer.label'))}
    >
      <OfferViewCount key={offer.id} offerId={offer.id} />
      <div
        className="flex flex-col gap-5 p-5"
        style={{backgroundColor: colors.background ?? undefined, color: colors.text ?? undefined}}
      >
        {offer.descriptionHtml && (
          <RichText data={offer.descriptionHtml} headingStart={3} className="prose prose-inherit max-w-none" />
        )}
        {endsAt && (
          <Countdown endsAt={endsAt} label={(time) => t('cart.offer.endsIn', {time})} className="text-small" />
        )}
        {isUpSell(offer) ? (
          <UpSellChoice offer={offer} accept={accept} onAdded={onAdded} />
        ) : (
          <ul className="flex flex-col gap-4">
            {offer.products.map((product) => (
              <OfferProduct
                key={product.id}
                product={product}
                offerId={offer.id}
                buttonText={offer.acceptButtonText}
                accept={accept}
                added={added}
                onAdded={onAdded}
              />
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          {added || taken ? (
            <Button onClick={proceed}>{t('cart.offer.done')}</Button>
          ) : (
            <button type="button" onClick={decline} className="text-body underline underline-offset-4">
              {offer.declineButtonText || t('cart.offer.decline')}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/** Counts an offer's view once, when it shows; the page's data is not read again for it. */
function OfferViewCount({offerId}: {offerId: string}) {
  const fetcher = useFetcher();
  const countedRef = useRef(false);

  useEffect(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    void fetcher.submit(
      {intent: 'viewed', offerId},
      {method: 'post', action: OFFER_ROUTE, defaultShouldRevalidate: false},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a view is counted once per offer, when it shows
  }, [offerId]);

  return null;
}

type OfferProductData = CartApiCrossSellOffer['products'][number];

/** One of a cross-sell's products: its price with the offer, a choice of variant, and its own add button. */
function OfferProduct({
  product,
  offerId,
  buttonText,
  accept,
  added,
  onAdded,
}: {
  product: OfferProductData;
  offerId: string;
  buttonText: string | null | undefined;
  accept: React.CSSProperties;
  added: boolean;
  onAdded: (data: unknown) => void;
}) {
  const {t} = useTranslation();
  const variants = product.variants.nodes;
  const buyable = variants.filter((variant) => variant.availableForSale);
  const [variantId, setVariantId] = useState(buyable[0]?.id ?? variants[0]?.id);
  const variant = variants.find((each) => each.id === variantId) ?? variants[0];
  if (!variant) return null;

  return (
    <li className="flex gap-4">
      <OfferImage image={product.featuredImage} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-medium">{product.title}</p>
        <Price price={variant.price} compareAtPrice={variant.compareAtPrice} />
        {!added && buyable.length > 1 && (
          <Select
            aria-label={t('cart.offer.variant')}
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="max-w-offer-select"
          >
            {buyable.map((each) => (
              <option key={each.id} value={each.id}>
                {each.title}
              </option>
            ))}
          </Select>
        )}
        {!added && (
          <OfferAddButton
            fetcherKey={`offer-${offerId}-${product.id}`}
            lines={[
              {
                merchandiseId: variant.id,
                quantity: 1,
                crossSellId: offerId,
                // What the cart shows of the line until the cart comes back.
                selectedVariant: {
                  ...variant,
                  title: product.title,
                  image: product.featuredImage,
                  selectedOptions: [],
                  product: {handle: product.handle, title: product.title},
                },
              },
            ]}
            label={buttonText || t('cart.offer.add')}
            style={accept}
            disabled={!variant.availableForSale}
            onAdded={onAdded}
          />
        )}
      </div>
    </li>
  );
}

/** An up-sell: the variant offered instead of the one in the cart, at the offer's price or for what it adds. */
function UpSellChoice({
  offer,
  accept,
  onAdded,
}: {
  offer: UpSell;
  accept: React.CSSProperties;
  onAdded: (data: unknown) => void;
}) {
  const {t} = useTranslation();
  const variant = offer.offerVariant;

  return (
    <div className="flex gap-4">
      <OfferImage image={variant.image} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-medium">{variant.product.title}</p>
        <p className="text-small text-muted">{t('cart.offer.instead', {title: offer.triggerVariant.title})}</p>
        {offer.showOnlyAdditionalCost ? (
          <Money data={offer.additionalCost}>{(amount) => <p>{t('cart.offer.additional', {amount})}</p>}</Money>
        ) : (
          <Price price={offer.price ?? variant.price} />
        )}
        <OfferAddButton
          fetcherKey={`offer-${offer.id}`}
          lines={[
            {
              merchandiseId: variant.id,
              quantity: offer.quantity ?? 1,
              upSellTriggerVariantId: offer.triggerVariant.id,
            },
          ]}
          label={offer.acceptButtonText || t('cart.offer.add')}
          style={accept}
          disabled={!variant.availableForSale}
          onAdded={onAdded}
        />
      </div>
    </div>
  );
}

/**
 * The offer's add button (Nitrogen's), then "Added" once the store took the line, with what the store did not quite do
 * as asked (a discount code it dropped, B-429); a refusal shows under the button.
 */
function OfferAddButton({
  fetcherKey,
  lines,
  label,
  style,
  disabled,
  onAdded,
}: {
  fetcherKey: string;
  lines: OptimisticCartLineInput[];
  label: string;
  style: React.CSSProperties;
  disabled: boolean;
  onAdded: (data: unknown) => void;
}) {
  const {t} = useTranslation();
  // The store's answer to the add once it took the line.
  const [took, setTook] = useState<unknown>(null);

  if (took) {
    return (
      <div className="flex flex-col gap-1">
        <p role="status" className="font-medium text-success">
          {t('cart.offer.added')}
        </p>
        <CartActionMessages data={took} />
      </div>
    );
  }

  return (
    <AddToCartButton
      fetcherKey={fetcherKey}
      lines={lines}
      className={`${buttonClass('primary')} self-start`}
      style={style}
      disabled={disabled}
      errorClassName="text-small text-error"
      onAdded={(data) => {
        setTook(data);
        onAdded(data);
      }}
    >
      {label}
    </AddToCartButton>
  );
}

function OfferImage({image}: {image: OfferProductData['featuredImage']}) {
  if (!image) return <span className="aspect-[3/4] w-20 shrink-0 bg-surface" />;
  return (
    <Image
      data={image}
      alt=""
      sizes="80px"
      width={80}
      className="aspect-[3/4] w-20 shrink-0 self-start object-contain"
    />
  );
}
