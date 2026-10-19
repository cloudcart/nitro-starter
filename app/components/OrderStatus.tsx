import {useTranslation} from '@cloudcart/nitrogen';
import type {OrderFinancialStatus, OrderFulfillmentStatus} from '@cloudcart/nitrogen/storefront-api-types';
import {Badge} from '~/components/ui/Badge';

/** An order's payment and delivery status, as badges in the store's language. */
export function OrderStatus({
  order,
}: {
  order: {financialStatus?: OrderFinancialStatus | null; fulfillmentStatus: OrderFulfillmentStatus};
}) {
  const {t} = useTranslation();
  const {financialStatus, fulfillmentStatus} = order;

  return (
    <span className="flex flex-wrap gap-1.5">
      {financialStatus && (
        <Badge variant={financialStatus === 'PAID' ? 'success' : 'neutral'}>
          {t(`account.order.financial.${financialStatus}`)}
        </Badge>
      )}
      <Badge variant={fulfillmentStatus === 'FULFILLED' ? 'success' : 'neutral'}>
        {t(`account.order.fulfillment.${fulfillmentStatus}`)}
      </Badge>
    </span>
  );
}
