import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/account.payments';
import {metaTranslator, privateMeta} from '~/lib/meta';
import type {AccountPaymentFragment} from 'storefrontapi.generated';
import {AccountSection} from '~/components/AccountSection';
import {PaginatedTable} from '~/components/DataTable';
import {DateText} from '~/components/DateText';
import {Badge} from '~/components/ui/Badge';
import {orderPath} from '~/lib/urls';
import {EmptyState} from '~/components/ui/EmptyState';
import {ButtonLink} from '~/components/ui/Button';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('account.nav.payments'));

/** /account/payments — every payment across the customer's orders, newest first. */
export async function loader({request, context}: Route.LoaderArgs) {
  const {customer, errors} = await context.customerAccount.query(PAYMENTS_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 25}),
  });
  if (!customer) throw missingResource(errors, 'Customer not found');

  return {payments: customer.payments};
}

export default function Payments() {
  const {t} = useTranslation();
  const {payments} = useLoaderData<typeof loader>();

  return (
    <AccountSection title={t('account.nav.payments')}>
      {payments.nodes.length ? (
        <PaginatedTable<AccountPaymentFragment>
          caption={t('account.nav.payments')}
          connection={payments}
          rowKey={(payment) => payment.id}
          columns={[
            {header: t('account.table.paymentMethod'), cell: (payment) => payment.providerName},
            {
              header: t('account.table.order'),
              cell: (payment) => (
                <Link to={orderPath(payment.orderId)} className="whitespace-nowrap inline-link">
                  {t('account.order.number', {number: payment.orderNumber})}
                </Link>
              ),
            },
            {header: t('account.table.date'), cell: (payment) => <DateText value={payment.createdAt} />},
            {header: t('account.table.reference'), cell: (payment) => payment.referenceId},
            {
              header: t('account.table.status'),
              cell: (payment) => <Badge variant="neutral">{payment.statusFormatted}</Badge>,
            },
            {
              header: t('account.table.amount'),
              cell: (payment) => <span className="font-medium whitespace-nowrap">{payment.amountFormatted}</span>,
              align: 'end',
            },
          ]}
        />
      ) : (
        <EmptyState
          text={t('account.payments.none')}
          action={
            <ButtonLink to="/account/orders" variant="secondary">
              {t('account.payments.toOrders')}
            </ButtonLink>
          }
        />
      )}
    </AccountSection>
  );
}

const PAYMENTS_QUERY = `#graphql
  fragment AccountPayment on CustomerPayment {
    id
    providerName
    amountFormatted
    statusFormatted
    referenceId
    orderId
    orderNumber
    createdAt
  }
  query AccountPayments(
    $customerAccessToken: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) {
    customer(customerAccessToken: $customerAccessToken) {
      payments(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...AccountPayment
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
` as const;
