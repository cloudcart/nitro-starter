import {Link, useLoaderData} from 'react-router';
import {Translated, useTranslation} from '@cloudcart/nitrogen';
import {Image, Money} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/account.order-view.$id';
import {metaTranslator, privateMeta} from '~/lib/meta';
import type {CustomerOrderQuery} from 'storefrontapi.generated';
import {ADDRESS_CARD_FRAGMENT, AddressCard} from '~/components/AddressCard';
import {DataTable} from '~/components/DataTable';
import {OrderStatus} from '~/components/OrderStatus';
import {ReturnStatus} from '~/components/ReturnStatus';
import {ButtonLink} from '~/components/ui/Button';
import {productPath} from '~/lib/urls';
import {DateText} from '~/components/DateText';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({data, matches}) => {
  const t = metaTranslator(matches);
  return privateMeta(data ? t('account.order.number', {number: data.order.orderNumber}) : t('account.nav.orders'));
};

/** /account/order-view/{id} — one of the customer's orders. */
export async function loader({params, context}: Route.LoaderArgs) {
  const {order, errors} = await context.customerAccount.query(ORDER_QUERY, {variables: {id: params.id}});
  if (!order) throw missingResource(errors, 'Order not found');

  return {order};
}

export default function OrderView() {
  const {t} = useTranslation();
  const {order} = useLoaderData<typeof loader>();
  const {fulfillment, returnEligibility} = order;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link to="/account/orders" className="text-small text-muted">
            <span aria-hidden="true">← </span>
            {t('account.order.back')}
          </Link>
          <h2 className="text-heading">{t('account.order.number', {number: order.orderNumber})}</h2>
          <p className="text-small text-muted">
            <Translated message="account.order.placedOn" values={{date: <DateText value={order.processedAt} />}} />
            {order.paymentMethod && (
              <>
                {t('format.separator')}
                {order.paymentMethod}
              </>
            )}
          </p>
        </div>
        <OrderStatus order={order} />
      </div>

      {fulfillment?.trackingNumber && (
        <p className="rounded-card bg-surface p-4 text-small">
          {fulfillment.shippingProvider && <>{fulfillment.shippingProvider}: </>}
          {fulfillment.trackingUrl ? (
            <a href={fulfillment.trackingUrl} target="_blank" rel="noreferrer" className="font-medium inline-link">
              {fulfillment.trackingNumber}
            </a>
          ) : (
            fulfillment.trackingNumber
          )}
        </p>
      )}

      <DataTable
        caption={t('account.order.lines')}
        rows={order.lineItems.nodes}
        rowKey={(line) => line.id}
        columns={[
          {header: t('account.table.product'), cell: (line) => <OrderLineProduct line={line} />},
          {header: t('account.table.quantity'), cell: (line) => line.quantity, align: 'end'},
          {
            header: t('account.table.total'),
            cell: (line) => <Money data={line.discountedTotalPrice} className="font-medium whitespace-nowrap" />,
            align: 'end',
          },
        ]}
      />

      <dl className="ml-auto flex w-full max-w-totals flex-col gap-2 text-small">
        {order.totals.map((row) => (
          <div
            key={`${row.group}-${row.name}`}
            className={`flex justify-between gap-4 ${row.group === 'total' ? 'border-t border-border pt-2 text-h5' : ''}`}
          >
            <dt>{row.name}</dt>
            <dd>{row.priceFormatted}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 md:grid-cols-2">
        {order.shippingAddress && (
          <AddressCard title={t('account.order.shippingAddress')} address={order.shippingAddress} />
        )}
        {order.billingAddress && (
          <AddressCard title={t('account.order.billingAddress')} address={order.billingAddress} />
        )}
      </div>

      {order.note && <p className="text-small text-muted">{t('account.order.note', {note: order.note})}</p>}

      {order.returns.length > 0 && (
        <div className="flex flex-col gap-2 text-small">
          <h3 className="text-h5">{t('account.nav.returns')}</h3>
          <ul className="flex flex-col gap-1">
            {order.returns.map((item) => (
              <li key={item.reference} className="flex items-center gap-2">
                {/* A document load: no marketing pixel's library runs on the return's private page (B-390). */}
                <Link to={`/withdrawal/${item.reference}`} reloadDocument className="inline-link">
                  {item.reference}
                </Link>
                <ReturnStatus status={item.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {returnEligibility.eligible && (
        <p className="flex flex-wrap items-center gap-3 text-small">
          {/* A document load: no marketing pixel's library runs on the return's private form, which the order's number
              is in the address of (B-449). */}
          <ButtonLink to={`/withdrawal?order=${order.orderNumber}`} reloadDocument variant="secondary">
            {t('account.order.returnItems')}
          </ButtonLink>
          {returnEligibility.endsAt && (
            <span className="text-muted">
              <Translated
                message="account.order.returnUntil"
                values={{date: <DateText value={returnEligibility.endsAt} />}}
              />
            </span>
          )}
        </p>
      )}
    </section>
  );
}

type OrderLine = NonNullable<CustomerOrderQuery['order']>['lineItems']['nodes'][number];

/** An order line's product: its image, its title (a link while the product is on sale) and the options chosen. */
function OrderLineProduct({line}: {line: OrderLine}) {
  const {t} = useTranslation();
  const options = line.variant?.selectedOptions ?? [];

  return (
    <div className="flex min-w-48 items-center gap-3">
      {line.image ? (
        // The line's title is beside it: the picture repeats nothing for a screen reader.
        <Image data={line.image} alt="" aspectRatio="1/1" width={56} className="size-14 rounded-card object-contain" />
      ) : (
        <span className="size-14 shrink-0 rounded-card bg-surface" />
      )}
      <div className="flex flex-col">
        {line.productHandle ? (
          <Link to={productPath(line.productHandle)} className="font-medium">
            {line.title}
          </Link>
        ) : (
          <span className="font-medium">{line.title}</span>
        )}
        {options.length > 0 && (
          <span className="text-small text-muted">
            {options
              .map((option) => t('format.nameValue', {name: option.name, value: option.value}))
              .join(t('format.separator'))}
          </span>
        )}
      </div>
    </div>
  );
}

const ORDER_QUERY = `#graphql
  fragment OrderMoney on MoneyV2 {
    amount
    currencyCode
    formatted
  }
  query CustomerOrder($customerAccessToken: String!, $id: ID!) {
    order(customerAccessToken: $customerAccessToken, id: $id) {
      orderNumber
      processedAt
      financialStatus
      fulfillmentStatus
      paymentMethod
      note
      totals {
        group
        name
        priceFormatted
      }
      lineItems(first: 100) {
        nodes {
          id
          title
          quantity
          productHandle
          image {
            url
            altText
            width
            height
          }
          variant {
            selectedOptions {
              name
              value
            }
          }
          discountedTotalPrice {
            ...OrderMoney
          }
        }
      }
      shippingAddress {
        ...AddressCard
      }
      billingAddress {
        ...AddressCard
      }
      fulfillment {
        shippingProvider
        trackingNumber
        trackingUrl
      }
      returnEligibility {
        eligible
        endsAt
      }
      returns {
        reference
        status
      }
    }
  }
  ${ADDRESS_CARD_FRAGMENT}
` as const;
