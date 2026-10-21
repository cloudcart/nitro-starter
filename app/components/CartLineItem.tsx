import {useEffect, useState} from 'react';
import {Link, useFetcher} from 'react-router';
import {CartForm, type OptimisticCartLine, Translated, useTranslation} from '@cloudcart/nitrogen';
import {Image, Money, KeptLink} from '@cloudcart/nitrogen-react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {CartActionMessages} from '~/components/CartActionMessages';
import {Charge} from '~/components/Charge';
import type {CartLayout} from '~/components/CartMain';
import {OfferAnswer} from '~/components/CartOfferDialog';
import {RemoveIcon} from '~/components/ui/icons';
import {Price} from '~/components/ui/Price';
import {QuantityStepper} from '~/components/ui/QuantityStepper';
import {productPath} from '~/lib/urls';
import {useVariantUrl} from '~/lib/variants';
import type {action as cartAction} from '~/routes/cart';
import {useAside} from './Aside';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/** How long a typed quantity rests before it is sent: one change for several digits. A press of − or + goes at once. */
const QUANTITY_TYPING_DELAY_MS = 300;

/**
 * A line in the cart: the product's portrait image, title and options, the merchant's customizations, the
 * discounts on it (on the cart page; the drawer names none — its price shows the reduction, T-553), the store's notes
 * about it, its price, and the controls to change its quantity or remove it.
 */
export function CartLineItem({
  layout,
  line,
  inBundle = false,
  loading = 'lazy',
}: {
  layout: CartLayout;
  line: CartLine;
  inBundle?: boolean;
  /** `eager` for a line on the cart page's first screen (B-443). */
  loading?: 'eager' | 'lazy';
}) {
  const {t} = useTranslation();
  // A line just added (`isOptimistic`) has only its merchandise and quantity until the cart comes back.
  const {merchandise} = line;
  const {product, selectedOptions} = merchandise;
  // The variant's own picture, or the product's when it has none (B-359).
  const image = merchandise.image ?? product.featuredImage;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const width = inBundle ? 'w-14' : layout === 'page' ? 'w-24 md:w-28' : 'w-20';
  const unit = line.cost?.amountPerQuantity;
  const unitBefore = line.cost?.compareAtAmountPerQuantity;

  return (
    // `group/line`: while its quantity's change is on its way, its prices shimmer until the store answers.
    <li className={`group/line flex gap-4 ${inBundle ? 'py-3' : 'py-5'}`}>
      {/* `self-start`: the picture keeps its own proportions (`Image` sets them), at the top, while the line grows (a
          unit price, a refusal), instead of stretching with it and moving the picture down. */}
      {image ? (
        <Image
          alt=""
          data={image}
          loading={loading}
          sizes="112px"
          width={112}
          className={`${width} aspect-[3/4] shrink-0 self-start object-contain`}
        />
      ) : (
        <span className={`${width} aspect-[3/4] shrink-0 self-start bg-surface`} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <KeptLink
            to={lineItemUrl}
            onClick={() => layout === 'aside' && close()}
            className="font-medium hover:underline"
          >
            {product.title}
          </KeptLink>
          {line.cost?.totalAmount && (
            <Price price={line.cost.totalAmount} className="shrink-0 font-medium group-has-data-pending/line:shimmer" />
          )}
        </div>
        {selectedOptions.length > 0 && (
          <p className="text-small text-muted">
            {selectedOptions
              .map((option) => t('format.nameValue', {name: option.name, value: option.value}))
              .join(t('format.separator'))}
          </p>
        )}
        {unit && (line.quantity > 1 || unitBefore) && (
          <Price
            price={unit}
            compareAtPrice={unitBefore}
            className="w-fit text-small text-muted group-has-data-pending/line:shimmer"
          />
        )}
        {line.options?.map((option) => (
          <p key={`${option.name}-${option.value}`} className="text-small text-muted">
            {t('format.nameValue', {name: option.name, value: option.value ?? ''})}
            <Charge charge={option} />
          </p>
        ))}
        {layout === 'page' &&
          line.discountAllocations?.map((discount) => (
            <p key={`${discount.title}-${discount.code ?? ''}`} className="text-small text-success">
              <Translated
                message="format.nameValue"
                values={{
                  name: discount.title,
                  value: (
                    <>
                      −<Money data={discount.discountedAmount} />
                    </>
                  ),
                }}
              />
            </p>
          ))}
        {line.warnings?.map((warning) => (
          <p key={warning.code} className="text-small text-warning">
            {warning.message}
          </p>
        ))}
        {inBundle ? (
          <p className="text-small text-muted">{t('cart.fixedQuantity', {count: line.quantity})}</p>
        ) : (
          <CartLineQuantity line={line} />
        )}
      </div>
    </li>
  );
}

/** A bundle: its title, then its products, removed together. */
export function CartBundle({
  bundle,
  lines,
  layout,
  loading,
}: {
  bundle: NonNullable<CartLine['bundle']>;
  lines: CartLine[];
  layout: CartLayout;
  /** `eager` for a bundle on the cart page's first screen (B-443). */
  loading?: 'eager' | 'lazy';
}) {
  const {t} = useTranslation();
  const {close} = useAside();
  const lineIds = lines.map((line) => line.id);
  const isOptimistic = lines.some((line) => line.isOptimistic);

  return (
    <li className="py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">
          {bundle.product ? (
            <Link to={productPath(bundle.product.handle)} onClick={() => layout === 'aside' && close()}>
              {bundle.title}
            </Link>
          ) : (
            bundle.title
          )}
          {bundle.quantity > 1 && (
            <span className="ml-2 font-normal text-muted">{t('format.times', {quantity: bundle.quantity})}</span>
          )}
        </p>
        <CartLineRemoveButton
          lineIds={lineIds}
          disabled={isOptimistic}
          label={t('cart.removeBundle', {title: bundle.title ?? ''})}
        />
      </div>
      <ul className="mt-2 border-l-2 border-border pl-4">
        {lines.map((line) => (
          <CartLineItem key={line.id} line={line} layout={layout} loading={loading} inBundle />
        ))}
      </ul>
    </li>
  );
}

/**
 * The quantity and the remove button; a quantity the merchant fixed is shown as text. A press of − or + is sent at
 * once, a typed quantity when the typing rests; one change at a time, so they reach the store in order — presses
 * while one is on its way are sent as one when it is answered (B-242). Then the store's refusal or warning shows under
 * it, and the offer the store answers with opens.
 */
function CartLineQuantity({line}: {line: CartLine}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<typeof cartAction>({key: getUpdateKey([line.id])});
  // What the buyer chose, and what the store has or is being sent.
  const [value, setValue] = useState(line.quantity);
  const [sent, setSent] = useState(line.quantity);
  const [typed, setTyped] = useState(false);
  // The cart's quantity wins when it changes: the store's answer, or a refused change set back.
  const [cartQuantity, setCartQuantity] = useState(line.quantity);
  if (line.quantity !== cartQuantity) {
    setCartQuantity(line.quantity);
    setValue(line.quantity);
    setSent(line.quantity);
  }

  const submitting = fetcher.state === 'submitting';
  useEffect(() => {
    if (submitting || value === sent) return;
    const timer = setTimeout(
      () => {
        setSent(value);
        void fetcher.submit(
          {
            [CartForm.INPUT_NAME]: JSON.stringify({
              action: CartForm.ACTIONS.LinesUpdate,
              inputs: {lines: [{id: line.id, quantity: value}]},
            }),
          },
          {method: 'post', action: '/cart'},
        );
      },
      typed ? QUANTITY_TYPING_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [fetcher, line.id, sent, submitting, typed, value]);

  const change = (next: number, byTyping: boolean) => {
    setValue(next);
    setTyped(byTyping);
  };

  return (
    <>
      {/* Pending from the click until the store answers: the prices only the store can give fade meanwhile. */}
      <div
        data-pending={value !== line.quantity || fetcher.state !== 'idle' || undefined}
        className="mt-2 flex items-center gap-3"
      >
        {line.allowQuantityChange ? (
          <QuantityStepper
            value={value}
            onChange={change}
            min={line.merchandise.minimumQuantity}
            label={t('quantity.of', {title: line.merchandise.product.title})}
            disabled={Boolean(line.isOptimistic)}
          />
        ) : (
          <span className="text-small text-muted">{t('cart.fixedQuantity', {count: line.quantity})}</span>
        )}
        <CartLineRemoveButton
          lineIds={[line.id]}
          disabled={Boolean(line.isOptimistic)}
          label={t('cart.removeLine', {title: line.merchandise.product.title})}
        />
      </div>
      <CartActionMessages data={fetcher.state === 'idle' ? fetcher.data : null} />
      <OfferAnswer offer={fetcher.state === 'idle' ? fetcher.data?.crossSellOffer : null} />
    </>
  );
}

function CartLineRemoveButton({lineIds, disabled, label}: {lineIds: string[]; disabled: boolean; label: string}) {
  return (
    <CartForm fetcherKey={getUpdateKey(lineIds)} route="/cart" action={CartForm.ACTIONS.LinesRemove} inputs={{lineIds}}>
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="grid size-11 place-items-center rounded-button text-muted hover:text-foreground disabled:opacity-40"
      >
        <RemoveIcon />
      </button>
    </CartForm>
  );
}

/**
 * One key per set of lines, so quick successive changes to the same lines
 * replace each other rather than run side by side.
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
