import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/account.orders';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {AccountSection} from '~/components/AccountSection';
import {ORDER_CARD_FRAGMENT, OrderList} from '~/components/OrderCard';
import {EmptyState} from '~/components/ui/EmptyState';
import {ButtonLink} from '~/components/ui/Button';
import {CartIcon} from '~/components/ui/icons';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('account.nav.orders'));

/** /account/orders — the customer's orders, newest first. */
export async function loader({request, context}: Route.LoaderArgs) {
  const {customer, errors} = await context.customerAccount.query(ORDERS_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 20}),
  });
  if (!customer) throw missingResource(errors, 'Customer not found');

  return {orders: customer.orders};
}

export default function Orders() {
  const {t} = useTranslation();
  const {orders} = useLoaderData<typeof loader>();

  return (
    <AccountSection title={t('account.nav.orders')} count={orders.totalCount}>
      {orders.nodes.length ? (
        <OrderList orders={orders} />
      ) : (
        <EmptyState
          icon={CartIcon}
          text={t('account.orders.none')}
          action={
            <ButtonLink to="/categories" variant="secondary">
              {t('account.orders.startShopping')}
            </ButtonLink>
          }
        />
      )}
    </AccountSection>
  );
}

const ORDERS_QUERY = `#graphql
  query CustomerOrders($customerAccessToken: String!, $first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    customer(customerAccessToken: $customerAccessToken) {
      # Newest first is the API's default order for a customer's orders.
      orders(first: $first, last: $last, before: $startCursor, after: $endCursor, sortKey: PROCESSED_AT) {
        totalCount
        nodes {
          ...OrderCard
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
  ${ORDER_CARD_FRAGMENT}
` as const;
