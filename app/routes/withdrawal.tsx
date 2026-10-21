import {useEffect, useState} from 'react';
import {data, Form, Link, useActionData, useLoaderData} from 'react-router';
import type {Route} from './+types/withdrawal';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import type {ReturnFlowFragment} from 'storefrontapi.generated';
import {type AnalyticsRouteHandle, type Translate, useTranslation} from '@cloudcart/nitrogen';
import {CheckboxField, Field, type FormError, FormStatus, RadioField, TextArea} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import {Checkbox, Input} from '~/components/ui/Field';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, integerOf, payloadOf, useSubmission} from '~/lib/action';
import {RETURN_USER_ERROR_FRAGMENT} from '~/lib/fragments';
import {ifSignedIn} from '~/lib/customer';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

/**
 * The return's form: an order's number in its address (`?order=`, from the order's page) and the visitor's answers.
 * Analytics reports it masked and the marketing pixels get nothing from it (B-449, B-390's rule).
 */
export const handle = {analytics: {private: true}} satisfies AnalyticsRouteHandle;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('withdrawal.title'));

/**
 * /withdrawal — returning items, as on the CloudCart storefront: the buyer
 * names the order and its e-mail, proves the e-mail with a code sent to it,
 * then chooses what to return and how to be refunded. Guests and signed-in
 * customers go through the same steps.
 */
export async function loader({url, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  let defaults = {name: '', email: '', orderNumber: url.searchParams.get('order') ?? ''};

  // A signed-in customer's name and e-mail fill the form in; a token the API turned down just means a guest.
  const customer = (await ifSignedIn(customerAccount, () => customerAccount.query(RETURN_CUSTOMER_QUERY)))?.customer;
  if (customer) defaults = {...defaults, name: customer.displayName, email: customer.email ?? ''};

  return {defaults};
}

/** The page's own refusals, named in the store's language: no item ticked, and a flow that ran out or is unknown. */
const PAGE_ERRORS = {NO_ITEMS: 'withdrawal.noItems', EXPIRED: 'withdrawal.expired'} as const;
const isPageError = (code: string | null | undefined): code is keyof typeof PAGE_ERRORS =>
  Boolean(code && code in PAGE_ERRORS);

/** Where the visitor is in the steps, carried from one action to the next. */

type Step =
  | {step: 'START'; errors?: FormError[]}
  | {step: 'AWAITING_CODE'; token: string; email: string; resendAt: number; errors?: FormError[]; resent?: boolean}
  | {step: 'VERIFIED'; flow: ReturnFlowFragment; errors?: FormError[]}
  | {step: 'DONE'; reference: string};

export async function action({request, context}: Route.ActionArgs) {
  const {storefront} = context;
  const form = await request.formData();
  const {text, optional} = formFields(form);
  const step = (value: Step) => data(value);
  // The API counts the wait down in seconds; the page keeps the moment it ends.
  const resendAt = (seconds: number) => Date.now() + seconds * 1000;

  switch (text('intent')) {
    case 'start': {
      const result = payloadOf(
        await storefront.mutate(RETURN_START_MUTATION, {
          variables: {name: text('name'), orderNumber: text('orderNumber'), email: text('email')},
        }),
        'returnRequestStart',
      );
      if (!result) return step({step: 'START', errors: [API_ERROR]});
      if (!result.flow) return step({step: 'START', errors: result.userErrors});
      return step({
        step: 'AWAITING_CODE',
        token: result.flow.token,
        email: text('email'),
        resendAt: resendAt(result.flow.resendAvailableInSeconds),
      });
    }
    case 'resend': {
      const token = text('token');
      const result = payloadOf(
        await storefront.mutate(RETURN_RESEND_MUTATION, {variables: {token}}),
        'returnRequestResendCode',
      );
      const waiting = {
        step: 'AWAITING_CODE',
        token,
        email: text('email'),
        resendAt: Number(text('resendAt')) || 0,
      } as const;
      // A refused call leaves the flow as it was (B-202).
      if (!result) return step({...waiting, errors: [API_ERROR]});
      // Too many resends leaves the flow as it was: the code already sent still works.
      if (!result.flow)
        return step(
          result.userErrors.some((e) => e.code === 'THROTTLED')
            ? {...waiting, errors: result.userErrors}
            : {step: 'START', errors: result.userErrors},
        );
      return step({...waiting, resendAt: resendAt(result.flow.resendAvailableInSeconds), resent: true});
    }
    case 'verify': {
      const token = text('token');
      const result = payloadOf(
        await storefront.mutate(RETURN_VERIFY_MUTATION, {variables: {token, code: text('code')}}),
        'returnRequestVerify',
      );
      if (!result) {
        return step({
          step: 'AWAITING_CODE',
          token,
          email: text('email'),
          resendAt: Number(text('resendAt')) || 0,
          errors: [API_ERROR],
        });
      }
      if (result.flow) return step({step: 'VERIFIED', flow: result.flow});
      // A wrong code keeps the flow; too many wrong codes end it, and the visitor starts over.
      if (result.userErrors.some((e) => e.code === 'INVALID_CODE')) {
        return step({
          step: 'AWAITING_CODE',
          token,
          email: text('email'),
          resendAt: Number(text('resendAt')) || 0,
          errors: result.userErrors,
        });
      }
      return step({step: 'START', errors: result.userErrors});
    }
    case 'create': {
      // The flow is read from the API by its token, never from the form: a copy sent back could say anything (B-189).
      const {returnRequestFlow: flow} = await storefront.query(RETURN_FLOW_QUERY, {
        variables: {token: text('token')},
        cache: storefront.CacheNone(),
      });
      if (flow?.step !== 'VERIFIED') {
        return step({step: 'START', errors: [{field: ['token'], message: '', code: 'EXPIRED'}]});
      }
      const whole = !flow.canPartial || text('scope') === 'whole';
      const lineItems = whole
        ? undefined
        : form.getAll('item').flatMap((group) =>
            String(group)
              .split(',')
              .map((lineItemId) => ({
                lineItemId,
                quantity: integerOf(form.get(`quantity-${lineItemId}`)) || undefined,
              })),
          );
      if (lineItems && !lineItems.length) {
        return step({
          step: 'VERIFIED',
          flow,
          errors: [{field: ['lineItems'], message: '', code: 'NO_ITEMS'}],
        });
      }
      const method = text('refundMethod');

      const result = payloadOf(
        await storefront.mutate(RETURN_CREATE_MUTATION, {
          variables: {
            token: flow.token,
            lineItems,
            note: optional('note'),
            refund: method
              ? {
                  method,
                  accountName: optional('accountName'),
                  iban: optional('iban'),
                  bic: optional('bic'),
                }
              : undefined,
          },
        }),
        'returnRequestCreate',
      );
      if (!result) return step({step: 'VERIFIED', flow, errors: [API_ERROR]});
      if (result.return) return step({step: 'DONE', reference: result.return.reference});
      if (result.userErrors.some((e) => e.code === 'INVALID_TOKEN'))
        return step({step: 'START', errors: result.userErrors});
      return step({step: 'VERIFIED', flow, errors: result.userErrors});
    }
    default:
      throw new Response('Unknown step', {status: 400});
  }
}

export default function Withdrawal() {
  const {t} = useTranslation();
  const {defaults} = useLoaderData<typeof loader>();
  const current: Step = useActionData<typeof action>() ?? {step: 'START'};
  const sending = useSubmission();
  const busy = sending !== null;

  switch (current.step) {
    case 'DONE':
      return (
        <Page>
          <FormStatus message={t('withdrawal.sent')} />
          <p className="mt-4">
            {t('withdrawal.track')}{' '}
            {/* A document load: no marketing pixel's library runs on the return's private page (B-390). */}
            <Link to={`/withdrawal/${current.reference}`} reloadDocument className="font-medium inline-link">
              {current.reference}
            </Link>
          </p>
        </Page>
      );
    case 'VERIFIED':
      return <ChooseItems flow={current.flow} errors={current.errors} busy={busy} />;
    case 'AWAITING_CODE':
      return <EnterCode current={current} sending={sending} />;
    default:
      return (
        <Page>
          <Form method="post" className="flex flex-col gap-4">
            <input type="hidden" name="intent" value="start" />
            <Field
              label={t('withdrawal.name')}
              name="name"
              required
              defaultValue={defaults.name}
              autoComplete="name"
              errors={current.errors}
            />
            <Field
              label={t('withdrawal.orderNumber')}
              name="orderNumber"
              required
              defaultValue={defaults.orderNumber}
              errors={current.errors}
            />
            <Field
              label={t('withdrawal.email')}
              name="email"
              type="email"
              required
              defaultValue={defaults.email}
              autoComplete="email"
              errors={current.errors}
            />
            <FormStatus errors={named(current.errors, t)} fields={['name', 'orderNumber', 'email']} />
            <Button type="submit" loading={busy} className="self-start">
              {t('withdrawal.continue')}
            </Button>
          </Form>
        </Page>
      );
  }
}

/** The errors with the page's own refusals named in the store's language. */
function named(errors: FormError[] | undefined, t: Translate) {
  return errors?.map((error) => (isPageError(error.code) ? {...error, message: t(PAGE_ERRORS[error.code])} : error));
}

/** The return pages' frame: the title, then the step. */
function Page({children}: {children: React.ReactNode}) {
  const {t} = useTranslation();

  return (
    <div className="mx-auto flex max-w-form-page flex-col gap-8 px-gutter py-10 md:px-gutter-md">
      <h1 className="text-title">{t('withdrawal.title')}</h1>
      <div>{children}</div>
    </div>
  );
}

/** The code the API e-mailed, with a resend that unlocks when the store allows it. */
function EnterCode({
  current,
  sending,
}: {
  current: Extract<Step, {step: 'AWAITING_CODE'}>;
  /** What the page's form is sending, if anything: the pressed button is its `intent`. */
  sending: FormData | null;
}) {
  const {t} = useTranslation();
  const resending = sending?.get('intent') === 'resend';
  const wait = useSecondsUntil(current.resendAt);

  return (
    <Page>
      <Form method="post" className="flex flex-col gap-4">
        <p className="text-muted">{t('withdrawal.codeSent', {email: current.email})}</p>
        {current.resent && !current.errors?.length && <FormStatus message={t('withdrawal.codeResent')} />}
        <input type="hidden" name="token" value={current.token} />
        <input type="hidden" name="email" value={current.email} />
        <input type="hidden" name="resendAt" value={current.resendAt} />
        <Field
          label={t('form.code')}
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          errors={current.errors}
        />
        <FormStatus errors={current.errors} fields={['code']} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" name="intent" value="verify" loading={sending?.get('intent') === 'verify'}>
            {t('withdrawal.continue')}
          </Button>
          <button
            type="submit"
            name="intent"
            value="resend"
            formNoValidate
            // Busy while it resends, keeping its focus; unavailable while the code is checked or the wait runs.
            aria-busy={resending || undefined}
            onClick={resending ? (event) => event.preventDefault() : undefined}
            disabled={sending?.get('intent') === 'verify' || wait > 0}
            className="busy inline-flex items-center gap-1.5 text-small text-muted underline disabled:no-underline disabled:opacity-50"
          >
            {wait > 0 ? t('withdrawal.resendIn', {seconds: wait}) : t('withdrawal.resend')}
          </button>
        </div>
      </Form>
    </Page>
  );
}

/** Seconds left until `time`, ticking down once a second. */
function useSecondsUntil(time: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= time) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [time]);

  return Math.max(0, Math.ceil((time - now) / 1000));
}

/** The verified order: which items go back, and how the money comes back. */
function ChooseItems({flow, errors, busy}: {flow: ReturnFlowFragment; errors?: FormError[]; busy: boolean}) {
  // An order that can only go back whole offers no choice; one partly returned already offers only items.
  const {t} = useTranslation();
  const [scope, setScope] = useState<'whole' | 'items'>(flow.canPartial ? 'items' : 'whole');
  const [method, setMethod] = useState('');

  if (!flow.hasReturnable) {
    return (
      <Page>
        <p className="text-muted">{t('withdrawal.nothingLeft')}</p>
      </Page>
    );
  }

  // Bundle members go back together, so they share one checkbox.
  const groups = Object.values(
    flow.returnableItems.reduce<Record<string, ReturnFlowFragment['returnableItems']>>((all, item) => {
      const key = item.bundleId ? `bundle-${item.bundleId}` : `line-${item.id}`;
      (all[key] ??= []).push(item);
      return all;
    }, {}),
  );
  const {refundOptions} = flow;
  const card = scope === 'whole' ? refundOptions.cardForFullReturn : refundOptions.cardForPartialReturn;
  const chosen =
    method === 'card' && card
      ? 'card'
      : method === 'bank' && refundOptions.bank
        ? 'bank'
        : card
          ? 'card'
          : refundOptions.bank
            ? 'bank'
            : '';

  return (
    <Page>
      <Form method="post" className="flex flex-col gap-6">
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="token" value={flow.token} />
        {flow.order && (
          <p className="text-small text-muted">{t('account.order.number', {number: flow.order.orderNumber})}</p>
        )}
        {flow.isCancellation && scope === 'whole' && (
          <p className="rounded-card bg-surface p-4 text-small">{t('withdrawal.cancels')}</p>
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-h5">{t('withdrawal.whatGoesBack')}</legend>
          {flow.canPartial && flow.allowFull && (
            <RadioField
              name="scope"
              value="whole"
              checked={scope === 'whole'}
              onChange={() => setScope('whole')}
              label={t('withdrawal.whole')}
            />
          )}
          {flow.canPartial && flow.allowFull && (
            <RadioField
              name="scope"
              value="items"
              checked={scope === 'items'}
              onChange={() => setScope('items')}
              label={t('withdrawal.someItems')}
            />
          )}
          {!flow.canPartial && <p className="text-small text-muted">{t('withdrawal.wholeOnly')}</p>}
          {scope === 'items' && (
            <ul className={`flex flex-col gap-2 ${flow.allowFull ? 'ml-6' : ''}`}>
              {groups.map((members) => (
                <li key={members[0].id} className="flex items-start gap-3">
                  <Checkbox
                    name="item"
                    value={members.map((item) => item.id).join(',')}
                    aria-label={members.map((item) => item.title).join(t('format.list'))}
                    className="mt-1"
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    {members.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="flex-1">{item.title}</span>
                        {item.fullOnly ? (
                          <span className="text-muted">{t('format.times', {quantity: item.remaining})}</span>
                        ) : (
                          <Input
                            type="number"
                            name={`quantity-${item.id}`}
                            min={1}
                            max={item.remaining}
                            defaultValue={item.remaining}
                            aria-label={t('withdrawal.howMany', {title: item.title})}
                            className="w-20"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <FormStatus
            errors={named(
              errors?.filter((error) => error.field?.[0] === 'lineItems'),
              t,
            )}
            fields={[]}
          />
        </fieldset>

        {(card || refundOptions.bank) && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-h5">{t('withdrawal.refund')}</legend>
            {card && (
              <RadioField
                name="refundMethod"
                value="card"
                checked={chosen === 'card'}
                onChange={() => setMethod('card')}
                label={t('withdrawal.toCard')}
              />
            )}
            {refundOptions.bank && (
              <RadioField
                name="refundMethod"
                value="bank"
                checked={chosen === 'bank'}
                onChange={() => setMethod('bank')}
                label={t('withdrawal.toBank')}
              />
            )}
            {chosen === 'bank' && (
              <div className="ml-6 grid gap-4 md:grid-cols-2">
                <Field
                  label={t('withdrawal.accountHolder')}
                  name="accountName"
                  required
                  autoComplete="name"
                  errors={errors}
                />
                <Field label={t('withdrawal.iban')} name="iban" required errors={errors} />
                <Field label={t('withdrawal.bic')} name="bic" errors={errors} />
              </div>
            )}
          </fieldset>
        )}

        <TextArea label={t('withdrawal.note')} name="note" rows={3} errors={errors} />

        {flow.legalPages.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            {flow.legalPages.map((page) => (
              <CheckboxField
                key={page.id}
                required
                label={
                  <>
                    {t('withdrawal.acceptPage')}{' '}
                    {page.url ? (
                      <a href={page.url} target="_blank" rel="noreferrer" className="inline-link">
                        {page.title}
                      </a>
                    ) : (
                      page.title
                    )}
                  </>
                }
              />
            ))}
          </fieldset>
        )}

        <FormStatus
          errors={errors?.filter((error) => error.field?.[0] !== 'lineItems')}
          fields={['accountName', 'iban', 'bic', 'note']}
        />
        <Button type="submit" loading={busy} className="self-start">
          {flow.isCancellation && scope === 'whole' ? t('withdrawal.cancelOrder') : t('withdrawal.send')}
        </Button>
      </Form>
    </Page>
  );
}

const RETURN_FLOW_FRAGMENT = `#graphql
  fragment ReturnFlow on ReturnRequestFlow {
    token
    step
    resendAvailableInSeconds
    hasReturnable
    canPartial
    allowFull
    isCancellation
    order {
      orderNumber
    }
    returnableItems {
      id
      title
      remaining
      fullOnly
      bundleId
    }
    refundOptions {
      cardForFullReturn
      cardForPartialReturn
      bank
    }
    legalPages {
      id
      title
      url
    }
  }
` as const;

const RETURN_CUSTOMER_QUERY = `#graphql
  query ReturnCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      displayName
      email
    }
  }
` as const;

// The code's step reads the flow's token and the wait before another code; the items come once the code is right
// (`ReturnRequestVerify`, B-441).
const RETURN_START_MUTATION = `#graphql
  mutation ReturnRequestStart($name: String!, $orderNumber: String!, $email: String!) {
    returnRequestStart(name: $name, orderNumber: $orderNumber, email: $email) {
      flow {
        token
        resendAvailableInSeconds
      }
      userErrors {
        ...ReturnUserErrorFields
      }
    }
  }
  ${RETURN_USER_ERROR_FRAGMENT}
` as const;

const RETURN_RESEND_MUTATION = `#graphql
  mutation ReturnRequestResendCode($token: String!) {
    returnRequestResendCode(token: $token) {
      flow {
        resendAvailableInSeconds
      }
      userErrors {
        ...ReturnUserErrorFields
      }
    }
  }
  ${RETURN_USER_ERROR_FRAGMENT}
` as const;

const RETURN_FLOW_QUERY = `#graphql
  query ReturnRequestFlow($token: String!) {
    returnRequestFlow(token: $token) {
      ...ReturnFlow
    }
  }
  ${RETURN_FLOW_FRAGMENT}
` as const;

const RETURN_VERIFY_MUTATION = `#graphql
  mutation ReturnRequestVerify($token: String!, $code: String!) {
    returnRequestVerify(token: $token, code: $code) {
      flow {
        ...ReturnFlow
      }
      userErrors {
        ...ReturnUserErrorFields
      }
    }
  }
  ${RETURN_FLOW_FRAGMENT}
  ${RETURN_USER_ERROR_FRAGMENT}
` as const;

const RETURN_CREATE_MUTATION = `#graphql
  mutation ReturnRequestCreate($token: String!, $lineItems: [ReturnLineItemInput!], $note: String, $refund: ReturnRefundInput) {
    returnRequestCreate(token: $token, lineItems: $lineItems, note: $note, refund: $refund) {
      return {
        reference
      }
      userErrors {
        ...ReturnUserErrorFields
      }
    }
  }
  ${RETURN_USER_ERROR_FRAGMENT}
` as const;
