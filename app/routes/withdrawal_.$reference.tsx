import {Link, useLoaderData} from 'react-router';
import {type AnalyticsRouteHandle, Translated, useTranslation} from '@cloudcart/nitrogen';
import {Money} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/withdrawal_.$reference';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {ReturnStatus} from '~/components/ReturnStatus';
import {productPath} from '~/lib/urls';
import {DateText} from '~/components/DateText';
import {missingResource} from '~/lib/missing';

// A page that throws is titled by the root's `meta`.
/** The reference is a key: analytics reports the page with it masked, and the marketing pixels get nothing (B-390). */
export const handle = {analytics: {private: true}} satisfies AnalyticsRouteHandle;

export const meta: Route.MetaFunction = ({data, matches}) =>
  data ? privateMeta(metaTranslator(matches)('withdrawal.status.title', {reference: data.reference})) : [];

/**
 * /withdrawal/{reference} — where a return stands, opened from the link in
 * the store's e-mails. Needs no sign-in: the reference is the key. The `_`
 * keeps it out of `withdrawal.tsx`, the form, which has no outlet.
 */
export async function loader({params, context}: Route.LoaderArgs) {
  // The return's own data: whoever holds the reference sees the buyer's name and items — no cache keeps the answer.
  context.personal.mark('a return by its reference');
  const {returnByReference, errors} = await context.storefront.query(RETURN_QUERY, {
    variables: {reference: params.reference},
    cache: context.storefront.CacheNone(),
  });
  if (!returnByReference) throw missingResource(errors, 'Not found');
  return returnByReference;
}

export default function ReturnTracking() {
  const {t} = useTranslation();
  const item = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex max-w-form-page flex-col gap-6 px-gutter py-10 md:px-gutter-md">
      <div className="flex flex-col gap-2">
        <h1 className="text-title">{t('withdrawal.status.title', {reference: item.reference})}</h1>
        <p className="flex flex-wrap items-center gap-3 text-small text-muted">
          <ReturnStatus status={item.status} />
          {item.orderNumber && <span>{t('account.order.number', {number: item.orderNumber})}</span>}
          {item.requestedAt && (
            <span>
              <Translated message="withdrawal.status.sentOn" values={{date: <DateText value={item.requestedAt} />}} />
            </span>
          )}
        </p>
      </div>

      {item.statusNote && <p className="rounded-card bg-surface p-4 text-small">{item.statusNote}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-h5">{item.isFullReturn ? t('withdrawal.whole') : t('withdrawal.status.items')}</h2>
        {item.lineItems.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border text-small">
            {item.lineItems.map((line, index) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- return lines have no id and never reorder
              <li key={index} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <span className="flex-1">
                  {line.product ? (
                    <Link to={productPath(line.product.handle)} className="font-medium">
                      {line.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{line.title}</span>
                  )}
                  {line.selectedOptions.length > 0 && (
                    <span className="block text-small text-muted">
                      {line.selectedOptions
                        .map((option) => t('format.nameValue', {name: option.name, value: option.value}))
                        .join(t('format.separator'))}
                    </span>
                  )}
                </span>
                <span className="text-muted">{t('format.times', {quantity: line.quantity})}</span>
                <Money data={line.refundTotal} className="font-medium" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {item.totals.length > 0 && (
        <dl className="flex flex-col gap-2 text-small">
          {item.totals.map((total) => (
            <div
              key={total.key}
              className={`flex justify-between ${total.key === 'total' ? 'border-t border-border pt-2 text-h5' : ''}`}
            >
              {/* The API's label, as the platform's return page writes it (B-454). */}
              <dt>{total.name}</dt>
              <dd>
                <Money data={total.amount} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {item.refund && (
        <section className="flex flex-col gap-1 text-small">
          <h2 className="mb-1 text-h5">{t('withdrawal.refund')}</h2>
          <p>
            {[
              item.refund.method === 'bank'
                ? t('withdrawal.status.toBank')
                : item.refund.method === 'card'
                  ? t('withdrawal.status.toCard')
                  : item.refund.method,
              item.refund.accountName,
              item.refund.ibanLast4 && t('withdrawal.status.ending', {digits: item.refund.ibanLast4}),
            ]
              .filter(Boolean)
              .join(t('format.separator'))}
          </p>
          {item.refund.refundedAmount && (
            <p className="text-success">
              {item.refund.refundedAt ? (
                <Translated
                  message="withdrawal.status.refundedAmountOn"
                  values={{
                    amount: <Money as="span" data={item.refund.refundedAmount} />,
                    date: <DateText value={item.refund.refundedAt} />,
                  }}
                />
              ) : (
                <Translated
                  message="withdrawal.status.refundedAmount"
                  values={{amount: <Money as="span" data={item.refund.refundedAmount} />}}
                />
              )}
            </p>
          )}
        </section>
      )}

      {item.note && (
        <section className="flex flex-col gap-1 text-small">
          <h2 className="mb-1 text-h5">{t('withdrawal.status.yourNote')}</h2>
          <p className="whitespace-pre-line">{item.note}</p>
        </section>
      )}
    </div>
  );
}

const RETURN_MONEY_FRAGMENT = `#graphql
  fragment ReturnMoney on MoneyV2 {
    amount
    currencyCode
    formatted
  }
` as const;

const RETURN_QUERY = `#graphql
  query ReturnByReference($reference: String!) {
    returnByReference(reference: $reference) {
      reference
      status
      statusNote
      requestedAt
      orderNumber
      isFullReturn
      note
      lineItems {
        title
        quantity
        refundTotal {
          ...ReturnMoney
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
        }
      }
      totals {
        key
        name
        amount {
          ...ReturnMoney
        }
      }
      refund {
        method
        accountName
        ibanLast4
        refundedAmount {
          ...ReturnMoney
        }
        refundedAt
      }
    }
  }
  ${RETURN_MONEY_FRAGMENT}
` as const;
