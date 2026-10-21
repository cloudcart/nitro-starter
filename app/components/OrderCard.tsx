import {type PaginationProps, useTranslation} from '@cloudcart/nitrogen';
import {Money, PaginatedResourceSection, KeptLink} from '@cloudcart/nitrogen-react';
import type {OrderCardFragment} from 'storefrontapi.generated';
import {DateText} from '~/components/DateText';
import {OrderStatus} from '~/components/OrderStatus';
import {buttonClass} from '~/components/ui/Button';
import {orderPath} from '~/lib/urls';

/** What an order card shows, for the orders page's query. */
export const ORDER_CARD_FRAGMENT = `#graphql
  fragment OrderCard on Order {
    id
    orderNumber
    processedAt
    financialStatus
    fulfillmentStatus
    totalPrice {
      amount
      currencyCode
      formatted
    }
  }
` as const;

/**
 * One of the customer's orders: its number, which opens it (the whole card is the link), the date, the payment and
 * delivery statuses, and the total.
 */
export function OrderCard({order}: {order: OrderCardFragment}) {
  const {t} = useTranslation();

  return (
    <article className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card border border-border p-4 hover:bg-surface md:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-h5">
          <KeptLink to={orderPath(order.id)} className="after:absolute after:inset-0 hover:no-underline">
            {t('account.order.number', {number: order.orderNumber})}
          </KeptLink>
        </h3>
        <DateText value={order.processedAt} className="text-small text-muted" />
      </div>
      <OrderStatus order={order} />
      <Money data={order.totalPrice} className="font-medium md:ml-auto" />
    </article>
  );
}

/** The customer's orders as cards, newest first, with "Load more" and "Load previous". */
export function OrderList({orders}: {orders: PaginationProps<OrderCardFragment>['connection']}) {
  const {t} = useTranslation();

  return (
    <PaginatedResourceSection<OrderCardFragment>
      connection={orders}
      resourcesClassName="flex flex-col gap-3"
      paginationClassName={`my-4 ${buttonClass('secondary', {fullWidth: true})}`}
      previousLabel={t('listing.loadPrevious')}
      nextLabel={t('listing.loadMore')}
      loadingLabel={t('listing.loading')}
    >
      {({node}) => <OrderCard key={node.id} order={node} />}
    </PaginatedResourceSection>
  );
}
