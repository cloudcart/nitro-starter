import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  getAttribution,
  type FastOrderCompletePayload,
  type ListProductPayload,
  useAnalytics,
  useTranslation,
} from '@cloudcart/nitrogen';
import type {BackInStockChannel} from '@cloudcart/nitrogen/storefront-api-types';
import type {FormPolicyFragment, ProductFastOrderFragment} from 'storefrontapi.generated';
import type {OrderConsent} from '~/lib/fragments';
import {ConsentCheckboxes, Field, type FormError, FormStatus, PolicyCheckboxes, TextArea} from './FormFields';
import {RichText} from '@cloudcart/nitrogen-react';
import {Button} from '~/components/ui/Button';
import {growOpen} from '~/lib/motion';

/** What the product page's action answers for each of these forms. */
export type ProductFormResult = {
  intent: string;
  ok: boolean;
  message?: string | null;
  errors?: FormError[];
  orderNumber?: string | null;
  /** A placed fast order, for the browser's pixels: the id the API reported it under, the order and the e-mail's hash. */
  purchase?: Pick<FastOrderCompletePayload, 'eventId' | 'order' | 'emailHash' | 'cloudCartAnalytics'>;
};

/**
 * "Let me know when it is back": for a product the merchant lets visitors
 * subscribe to. The visitor becomes a Marketing Suite subscriber and is told
 * by e-mail or text message, on the channels the store has set up.
 */
export function BackInStockForm({
  productId,
  variantId,
  channels,
  policies,
}: {
  productId: string;
  variantId?: string;
  channels: BackInStockChannel[];
  policies: FormPolicyFragment[];
}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<ProductFormResult>({key: `back-in-stock-${productId}`});
  const result = fetcher.data?.intent === 'backInStock' ? fetcher.data : undefined;

  if (!channels.length) return null;
  if (result?.ok) return <FormStatus message={result.message ?? t('product.backInStock.done')} />;

  return (
    <fetcher.Form method="post" className="flex flex-col gap-3 rounded-card border border-border p-4">
      <p className="font-medium">{t('product.backInStock.title')}</p>
      <input type="hidden" name="intent" value="backInStock" />
      <input type="hidden" name="productId" value={productId} />
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t('form.firstName')}
          name="firstName"
          required
          errors={result?.errors}
          autoComplete="given-name"
        />
        <Field label={t('form.lastName')} name="lastName" required errors={result?.errors} autoComplete="family-name" />
      </div>
      {channels.includes('EMAIL') && (
        <Field
          label={t('form.email')}
          name="email"
          type="email"
          required={!channels.includes('PHONE')}
          errors={result?.errors}
          autoComplete="email"
        />
      )}
      {channels.includes('PHONE') && (
        <Field
          label={t('form.phone')}
          name="phone"
          type="tel"
          required={!channels.includes('EMAIL')}
          errors={result?.errors}
          autoComplete="tel"
        />
      )}
      <PolicyCheckboxes policies={policies} form="SEGMENT_SUBSCRIPTION_POPUP" errors={result?.errors} />
      <FormStatus errors={result?.errors} fields={['firstName', 'lastName', 'email', 'phone', 'acceptedPolicyIds']} />
      <Button type="submit" loading={fetcher.state !== 'idle'}>
        {t('product.backInStock.submit')}
      </Button>
    </fetcher.Form>
  );
}

/** "Ask about this product": for products sold on request. The merchant gets it as a contact form message. */
export function ProductInquiryForm({
  productId,
  variantId,
  productTitle,
  policies,
  isLoggedIn,
}: {
  productId: string;
  variantId?: string;
  productTitle: string;
  policies: FormPolicyFragment[];
  isLoggedIn: boolean;
}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<ProductFormResult>({key: `inquiry-${productId}`});
  const result = fetcher.data?.intent === 'inquiry' ? fetcher.data : undefined;

  if (result?.ok) return <FormStatus message={result.message ?? t('product.inquiry.done')} />;

  return (
    <fetcher.Form method="post" className="flex flex-col gap-3 rounded-card border border-border p-4">
      <p className="font-medium">{t('product.inquiry.title')}</p>
      <input type="hidden" name="intent" value="inquiry" />
      <input type="hidden" name="productId" value={productId} />
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      <input type="hidden" name="subject" value={productTitle} />
      {/* A signed-in customer is not asked who they are: the store takes it from their account. */}
      {!isLoggedIn && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('form.firstName')}
              name="firstName"
              required
              errors={result?.errors}
              autoComplete="given-name"
            />
            <Field
              label={t('form.lastName')}
              name="lastName"
              required
              errors={result?.errors}
              autoComplete="family-name"
            />
          </div>
          <Field
            label={t('form.email')}
            name="email"
            type="email"
            required
            errors={result?.errors}
            autoComplete="email"
          />
          <Field label={t('form.phone')} name="phone" type="tel" required errors={result?.errors} autoComplete="tel" />
        </>
      )}
      <TextArea label={t('product.inquiry.message')} name="message" required errors={result?.errors} />
      <PolicyCheckboxes policies={policies} form="CONTACTS" errors={result?.errors} />
      <FormStatus
        errors={result?.errors}
        fields={['firstName', 'lastName', 'email', 'phone', 'message', 'acceptedPolicyIds']}
      />
      <Button type="submit" loading={fetcher.state !== 'idle'}>
        {t('product.inquiry.submit')}
      </Button>
    </fetcher.Form>
  );
}

/**
 * The store's fast order: the buyer leaves their contact details and the
 * product is ordered at once, paid on delivery — without the checkout and
 * without touching their cart. Only shown when the store offers it
 * (`fastOrderSettings`).
 *
 * The attempt token stays the same while the form is open, so a retry after a
 * dropped connection cannot place a second order. The order carries where the
 * buyer came from (`getAttribution()`), as a cart would.
 *
 * The button opens the form in its place: the form grows out of the button and
 * takes the focus.
 */
export function FastOrderForm({
  settings,
  consents,
  merchandiseId,
  product,
  quantity = 1,
  isLoggedIn,
}: {
  settings: ProductFastOrderFragment;
  consents: OrderConsent[];
  merchandiseId: string;
  /** The product as ordered, for the merchant's pixels. */
  product: ListProductPayload;
  quantity?: number;
  isLoggedIn: boolean;
}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const {publish, shop} = useAnalytics();
  const fetcher = useFetcher<ProductFormResult>({key: `fast-order-${merchandiseId}`});
  const result = fetcher.data?.intent === 'fastOrder' ? fetcher.data : undefined;
  const [attemptToken] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2),
  );
  const purchase = result?.ok ? result.purchase : undefined;
  const formRef = useRef<HTMLFormElement>(null);
  // The button's height as it was clicked: the form grows from it, once.
  const openedFromRef = useRef<number | null>(null);

  // The form, once laid out, grows out of the button's place and takes the focus the button had (B-348); the form
  // itself, so a phone does not open its keyboard.
  useLayoutEffect(() => {
    const form = formRef.current;
    const from = openedFromRef.current;
    if (!open || !form || from === null) return;
    openedFromRef.current = null;
    growOpen(form, from);
    form.focus({preventScroll: true});
  }, [open]);

  // The placed order, to the merchant's pixels once, under the id the API reported it with.
  useEffect(() => {
    if (purchase) {
      publish('fast_order_completed', {...purchase, trackingEvent: settings.trackingEvents.purchase, shop});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per order: its id changes only with a new one
  }, [purchase?.eventId]);

  if (result?.ok) {
    return settings.successMessageHtml ? (
      <RichText
        data={settings.successMessageHtml}
        headingStart={2}
        className="prose prose-tokens rounded-card bg-success/10 p-4"
      />
    ) : (
      <FormStatus
        message={
          result.orderNumber
            ? t('product.fastOrder.doneNumber', {number: result.orderNumber})
            : t('product.fastOrder.done')
        }
      />
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={(event) => {
          openedFromRef.current = event.currentTarget.offsetHeight;
          setOpen(true);
          publish('fast_order_started', {
            merchandiseId,
            quantity,
            product,
            trackingEvent: settings.trackingEvents.checkout,
            shop,
          });
        }}
      >
        {settings.buttonTitle}
      </Button>
    );
  }

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      tabIndex={-1}
      className="flex flex-col gap-3 rounded-card border border-border p-4"
      onSubmit={(event) => {
        // Read at the moment of sending: the analytics may have identified the visitor since the page loaded.
        const field = event.currentTarget.elements.namedItem('attribution');
        if (field instanceof HTMLInputElement) field.value = JSON.stringify(getAttribution() ?? {});
      }}
    >
      <p className="font-medium">{settings.buttonTitle}</p>
      {settings.descriptionHtml && (
        <RichText data={settings.descriptionHtml} headingStart={2} className="prose prose-tokens text-muted" />
      )}
      <input type="hidden" name="intent" value="fastOrder" />
      <input type="hidden" name="merchandiseId" value={merchandiseId} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="attemptToken" value={attemptToken} />
      <input type="hidden" name="attribution" defaultValue="" />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t('form.firstName')}
          name="firstName"
          required={settings.firstNameRequired}
          errors={result?.errors}
          autoComplete="given-name"
        />
        <Field
          label={t('form.lastName')}
          name="lastName"
          required={settings.lastNameRequired}
          errors={result?.errors}
          autoComplete="family-name"
        />
      </div>
      {/* A signed-in customer orders under their account's e-mail. */}
      {!isLoggedIn && (
        <Field
          label={t('form.email')}
          name="email"
          type="email"
          required
          errors={result?.errors}
          autoComplete="email"
        />
      )}
      <Field
        label={t('form.phone')}
        name="phone"
        type="tel"
        required={settings.phoneRequired}
        errors={result?.errors}
        autoComplete="tel"
      />
      <ConsentCheckboxes consents={consents} errors={result?.errors} />
      <FormStatus
        errors={result?.errors}
        fields={['firstName', 'lastName', ...(isLoggedIn ? [] : ['email']), 'phone', 'acceptedConsentIds']}
      />
      <Button type="submit" loading={fetcher.state !== 'idle'}>
        {settings.finishButtonTitle}
      </Button>
    </fetcher.Form>
  );
}
