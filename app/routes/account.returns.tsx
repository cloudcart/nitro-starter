import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {Money} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/account.returns';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {AccountSection} from '~/components/AccountSection';
import {PaginatedTable} from '~/components/DataTable';
import type {AccountReturnFragment} from 'storefrontapi.generated';
import {ButtonLink} from '~/components/ui/Button';
import {ReturnStatus} from '~/components/ReturnStatus';
import {DateText} from '~/components/DateText';
import {EmptyState} from '~/components/ui/EmptyState';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('account.nav.returns'));

/** /account/returns — the returns the customer requested, newest first, a page at a time (B-205). */
export async function loader({request, context}: Route.LoaderArgs) {
  const {customer, errors} = await context.customerAccount.query(RETURNS_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 20}),
  });
  if (!customer) throw missingResource(errors, 'Customer not found');

  return {returns: customer.returns};
}

export default function Returns() {
  const {t} = useTranslation();
  const {returns} = useLoaderData<typeof loader>();

  return (
    <AccountSection
      title={t('account.nav.returns')}
      action={
        <ButtonLink to="/withdrawal" variant="secondary">
          {t('account.returns.start')}
        </ButtonLink>
      }
    >
      {returns.nodes.length ? (
        <PaginatedTable<AccountReturnFragment>
          caption={t('account.nav.returns')}
          connection={returns}
          rowKey={(item) => item.id}
          columns={[
            {
              header: t('account.table.reference'),
              cell: (item) => (
                // A document load: no marketing pixel's library runs on the return's private page (B-390).
                <Link
                  to={`/withdrawal/${item.reference}`}
                  reloadDocument
                  className="font-medium whitespace-nowrap inline-link"
                >
                  {item.reference}
                </Link>
              ),
            },
            {
              header: t('account.table.order'),
              cell: (item) =>
                item.orderNumber && (
                  <span className="whitespace-nowrap">{t('account.order.number', {number: item.orderNumber})}</span>
                ),
            },
            {header: t('account.table.date'), cell: (item) => <DateText value={item.requestedAt} />},
            {header: t('account.table.status'), cell: (item) => <ReturnStatus status={item.status} />},
            {
              header: t('account.table.total'),
              cell: (item) => {
                const total = item.totals.find((row) => row.key === 'total');
                return total && <Money data={total.amount} className="font-medium whitespace-nowrap" />;
              },
              align: 'end',
            },
          ]}
        />
      ) : (
        // The section's "Return items" above is the way on.
        <EmptyState text={t('account.returns.none')} />
      )}
    </AccountSection>
  );
}

const RETURNS_QUERY = `#graphql
  fragment AccountReturn on Return {
    id
    reference
    status
    requestedAt
    orderNumber
    totals {
      key
      amount {
        amount
        currencyCode
        formatted
      }
    }
  }
  query CustomerReturns(
    $customerAccessToken: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) {
    customer(customerAccessToken: $customerAccessToken) {
      returns(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...AccountReturn
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
