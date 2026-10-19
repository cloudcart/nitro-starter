import {type ReactNode, useId, useLayoutEffect, useState} from 'react';
import type {Fetcher} from 'react-router';
import {CartForm, type OptimisticCart, useTranslation} from '@cloudcart/nitrogen';
import {Money, type MoneyType, RichText} from '@cloudcart/nitrogen-react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {CartActionMessages} from '~/components/CartActionMessages';
import type {CartLayout} from '~/components/CartMain';
import {Button, buttonClass} from '~/components/ui/Button';
import {Countdown} from '~/components/ui/Countdown';
import {Input} from '~/components/ui/Field';
import {CloseIcon, DiscountIcon} from '~/components/ui/icons';
import {STICKY_BAR, STICKY_BAR_ROW} from '~/components/ui/StickyBar';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

/** The fetcher key of the discount-code forms, so the code field shows what the store answered. */
const DISCOUNT_FETCHER_KEY = 'cart-discount-codes';

/**
 * The cart's summary. On the cart page: the store's own order summary (`Cart.totals`, its rows in its order with its
 * labels); the discounts the platform applied that have no row of their own — the lines' — each with its countdown;
 * what the buyer saves; the discount codes; the store's messages; and the way to CloudCart's checkout (`checkoutUrl`).
 * In the drawer only the store's subtotal and the way to checkout (T-553).
 */
export function CartSummary({cart, layout}: CartSummaryProps) {
  const {t} = useTranslation();
  const headingId = useId();
  const rows = cart?.totals ?? [];
  const rowKeys = new Set(rows.map((row) => row.key));
  // A discount on the whole cart is a row of the summary, under the same key; the others are listed here.
  const lineDiscounts = (cart?.discountApplications ?? []).filter((discount) => !rowKeys.has(discount.key));
  const subtotal = money(cart?.cost?.subtotalAmount);
  const saved = money(cart?.cost?.totalSavedAmount);
  const checkout = cart?.checkoutUrl && (
    <a href={cart.checkoutUrl} target="_self" className={buttonClass('primary', {fullWidth: true})}>
      {t('cart.checkout')}
    </a>
  );

  // The page's checkout button, watched for the bar below 990 px.
  const [checkoutElement, setCheckoutElement] = useState<HTMLDivElement | null>(null);
  const barShown = useOffScreen(checkoutElement);

  if (layout === 'aside') {
    return (
      <section
        aria-labelledby={headingId}
        className="flex shrink-0 flex-col gap-4 border-t border-border bg-background p-5"
      >
        <h2 id={headingId} className="sr-only">
          {t('cart.summary')}
        </h2>
        <SummaryRows rows={rows.filter((row) => row.group === 'subtotal')} subtotal={subtotal} />
        {checkout}
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5 bg-surface p-6 lg:sticky lg:top-24">
      <h2 id={headingId} className="text-subheading">
        {t('cart.summary')}
      </h2>
      {cart?.messages?.map((message) => (
        <RichText
          key={message.messageHtml}
          data={message.messageHtml}
          headingStart={3}
          className="rounded-card bg-background p-3 text-small text-warning"
        />
      ))}
      <SummaryRows rows={rows} subtotal={subtotal} />
      {lineDiscounts.length > 0 && (
        <section aria-label={t('cart.discounts')}>
          <ul className="flex flex-col gap-2 text-small">
            {lineDiscounts.map((discount) => (
              <li key={discount.key} className="flex flex-col">
                <span className="flex justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <DiscountIcon className="size-4" />
                    {discount.title}
                    {discount.code && <span className="text-muted">({discount.code})</span>}
                  </span>
                  <span className="text-success group-has-data-pending/cart:shimmer">
                    −<Money data={discount.totalAllocatedAmount} />
                  </span>
                </span>
                {discount.endsAt && (
                  <Countdown
                    endsAt={discount.endsAt}
                    label={(time) => t('cart.endsIn', {time})}
                    className="text-muted"
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {saved && Number(saved.amount) > 0 && (
        <Money data={saved}>
          {(amount) => (
            <p className="w-fit font-medium text-success group-has-data-pending/cart:shimmer">
              {t('cart.saved', {amount})}
            </p>
          )}
        </Money>
      )}
      <CartDiscountCodes discountCodes={cart?.discountCodes} />
      <div ref={setCheckoutElement}>{checkout}</div>
      {checkout && (
        // Below 990 px, where the summary follows every line: the subtotal and the checkout kept at the screen's
        // bottom while the summary's own button is off it (B-395).
        <div hidden={!barShown} className={`${STICKY_BAR} lg:hidden`} data-sticky-checkout>
          <div className={STICKY_BAR_ROW}>
            <div className="min-w-0 flex-1 self-center">
              <SummaryRows rows={rows.filter((row) => row.group === 'subtotal')} subtotal={subtotal} />
            </div>
            <a href={cart.checkoutUrl} target="_self" className={buttonClass('primary')}>
              {t('cart.checkout')}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

/** Whether `element` is off the screen, above or below it; false until it is known and without the observer. */
function useOffScreen(element: HTMLElement | null) {
  const [off, setOff] = useState(false);
  useLayoutEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const update = (rect: DOMRectReadOnly, bottom: number) => setOff(rect.bottom <= 0 || rect.top >= bottom);
    // Before the first paint: a cart longer than the screen shows the bar at once.
    update(element.getBoundingClientRect(), window.innerHeight);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) update(entry.boundingClientRect, entry.rootBounds?.bottom ?? window.innerHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return off;
}

/**
 * The store's summary rows as it gives them; while the cart is on its way and has none, its subtotal. While a line's
 * change is on its way the amounts shimmer: the totals are the store's, and they follow its answer.
 */
function SummaryRows({
  rows,
  subtotal,
}: {
  rows: NonNullable<NonNullable<CartSummaryProps['cart']>['totals']>;
  subtotal: MoneyType | null;
}) {
  const {t} = useTranslation();

  return (
    <dl className="flex flex-col gap-2">
      {rows.length > 0
        ? rows.map((row) => (
            <div
              key={`${row.group}-${row.key}`}
              className={`flex justify-between gap-4 ${row.group === 'total' ? 'border-t border-border pt-2 text-h5' : ''} ${row.afterTotal ? 'text-small text-muted' : ''}`}
            >
              <dt>
                {row.name}
                {row.description && <span className="ml-1 text-small text-muted">{row.description}</span>}
              </dt>
              <dd className="group-has-data-pending/cart:shimmer">
                <Money data={row.amount} />
              </dd>
            </div>
          ))
        : subtotal && (
            <div className="flex justify-between gap-4 font-medium">
              <dt>{t('cart.subtotal')}</dt>
              <dd className="group-has-data-pending/cart:shimmer">
                <Money data={subtotal} />
              </dd>
            </div>
          )}
    </dl>
  );
}

/** A cost of the cart, once it is whole: a cart still on its way has only part of it. */
function money(value: Partial<MoneyType> | null | undefined): MoneyType | null {
  return value?.amount && value.currencyCode
    ? {amount: value.amount, currencyCode: value.currencyCode, formatted: value.formatted}
    : null;
}

/**
 * The discount codes: the ones applied, each removable; the ones that do not apply to this cart; and the field for
 * a new one, with what the store answered.
 */
function CartDiscountCodes({discountCodes}: {discountCodes?: CartApiQueryFragment['discountCodes']}) {
  const {t} = useTranslation();
  const applied = discountCodes?.filter((discount) => discount.applicable).map(({code}) => code) ?? [];
  const notApplicable = discountCodes?.filter((discount) => !discount.applicable) ?? [];

  return (
    <div className="flex flex-col gap-2">
      {applied.length > 0 && (
        <ul aria-label={t('cart.appliedCodes')} className="flex flex-wrap gap-2">
          {applied.map((code) => (
            <li key={code}>
              <DiscountForm codes={applied.filter((other) => other !== code)}>
                {(fetcher) => {
                  // The code's own removal on its way: the codes sent lack it, and no new code is among them.
                  const sending = discountSending(fetcher);
                  const removing = Boolean(sending && !sending.adding && !sending.codes.includes(code));
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pr-1 pl-3 text-small">
                      <DiscountIcon className="size-4" />
                      {code}
                      <button
                        type="submit"
                        aria-label={t('cart.removeCode', {code})}
                        aria-busy={removing || undefined}
                        onClick={removing ? (event) => event.preventDefault() : undefined}
                        className="busy grid size-6 place-items-center rounded-full hover:bg-surface"
                      >
                        <CloseIcon className="size-4" />
                      </button>
                    </span>
                  );
                }}
              </DiscountForm>
            </li>
          ))}
        </ul>
      )}
      {notApplicable.map(({code}) => (
        <p key={code} className="text-small text-error">
          {t('cart.codeNotApplicable', {code})}
        </p>
      ))}
      <DiscountForm codes={applied}>
        {(fetcher) => (
          <>
            <div className="flex gap-2">
              <Input
                type="text"
                name="discountCode"
                aria-label={t('cart.discountCode')}
                placeholder={t('cart.discountCode')}
                autoComplete="off"
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="secondary" loading={Boolean(discountSending(fetcher)?.adding)}>
                {t('cart.applyCode')}
              </Button>
            </div>
            <CartActionMessages data={fetcher.state === 'idle' ? fetcher.data : null} />
          </>
        )}
      </DiscountForm>
    </div>
  );
}

/**
 * What the discount forms — one fetcher for all of them — are sending, while they are: the codes, and whether a new
 * code is among them (the field's form) rather than one removed. Null when nothing is on its way.
 */
function discountSending(fetcher: Fetcher): {codes: string[]; adding: boolean} | null {
  if (fetcher.state === 'idle' || !fetcher.formData) return null;
  const {inputs} = CartForm.getFormInput(fetcher.formData);
  const codes =
    'discountCodes' in inputs && Array.isArray(inputs.discountCodes) ? inputs.discountCodes.map(String) : [];
  return {codes, adding: fetcher.formData.has('discountCode')};
}

/** Sets the cart's codes: the ones kept, and the one typed in its `discountCode` field, if any. */
function DiscountForm({codes, children}: {codes: string[]; children: ReactNode | ((fetcher: Fetcher) => ReactNode)}) {
  return (
    <CartForm
      fetcherKey={DISCOUNT_FETCHER_KEY}
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{discountCodes: codes}}
    >
      {children}
    </CartForm>
  );
}
