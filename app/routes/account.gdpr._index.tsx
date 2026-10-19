import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, parseGid, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/account.gdpr._index';
import {metaTranslator, privateMeta} from '~/lib/meta';
import type {AccountPolicyAcceptanceFragment} from 'storefrontapi.generated';
import {AccountSection} from '~/components/AccountSection';
import {PaginatedTable} from '~/components/DataTable';
import {DateText} from '~/components/DateText';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('account.nav.policies'));

/**
 * /account/gdpr — the policies the customer accepted, newest first. Each opens
 * at /account/gdpr/{id} as it read when they accepted it.
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const {shop, customer, errors} = await context.customerAccount.query(POLICY_ACCEPTANCES_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 20}),
  });
  if (!customer) throw missingResource(errors, 'Customer not found');
  if (!shop?.gdprRequestTypes.length) throw missingResource(errors, 'Not found');

  return {acceptances: customer.policyAcceptances};
}

export default function PolicyAcceptances() {
  const {t} = useTranslation();
  const {acceptances} = useLoaderData<typeof loader>();

  return (
    <AccountSection title={t('account.nav.policies')}>
      {acceptances.nodes.length ? (
        <PaginatedTable<AccountPolicyAcceptanceFragment>
          caption={t('account.nav.policies')}
          connection={acceptances}
          rowKey={(node) => node.id}
          columns={[
            {
              header: t('account.table.policy'),
              cell: (node) => (
                <Link to={`/account/gdpr/${parseGid(node.id).id}`} className="font-medium inline-link">
                  {node.title}
                </Link>
              ),
            },
            {header: t('account.table.form'), cell: (node) => (node.form ? t(`gdpr.policyForm.${node.form}`) : null)},
            {header: t('account.table.date'), cell: (node) => <DateText value={node.acceptedAt} />},
          ]}
        />
      ) : (
        <p className="text-muted">{t('account.policies.none')}</p>
      )}
    </AccountSection>
  );
}

const POLICY_ACCEPTANCES_QUERY = `#graphql
  fragment AccountPolicyAcceptance on PolicyAcceptance {
    id
    title
    form
    acceptedAt
  }
  query AccountPolicyAcceptances($customerAccessToken: String!, $first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    shop {
      gdprRequestTypes
    }
    customer(customerAccessToken: $customerAccessToken) {
      policyAcceptances(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...AccountPolicyAcceptance
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
