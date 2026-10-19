import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/account.gdpr-requests';
import {metaTranslator, privateMeta} from '~/lib/meta';
import type {AccountGdprRequestFragment} from 'storefrontapi.generated';
import {AccountSection} from '~/components/AccountSection';
import {PaginatedTable} from '~/components/DataTable';
import {Badge} from '~/components/ui/Badge';
import {ButtonLink} from '~/components/ui/Button';
import {DateText} from '~/components/DateText';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({matches}) =>
  privateMeta(metaTranslator(matches)('account.nav.privacyRequests'));

/** /account/gdpr-requests — the GDPR requests the customer sent, newest first, and whether the store has handled them. */
export async function loader({request, context}: Route.LoaderArgs) {
  const {shop, customer, errors} = await context.customerAccount.query(GDPR_REQUESTS_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 20}),
  });
  if (!customer) throw missingResource(errors, 'Customer not found');
  if (!shop?.gdprRequestTypes.length) throw missingResource(errors, 'Not found');

  return {requests: customer.gdprRequests};
}

export default function GdprRequests() {
  const {t} = useTranslation();
  const {requests} = useLoaderData<typeof loader>();

  return (
    <AccountSection
      title={t('account.nav.privacyRequests')}
      action={
        <ButtonLink to="/gdpr/request" variant="secondary">
          {t('account.privacyRequests.new')}
        </ButtonLink>
      }
    >
      {requests.nodes.length ? (
        <PaginatedTable<AccountGdprRequestFragment>
          caption={t('account.nav.privacyRequests')}
          connection={requests}
          rowKey={(node) => node.id}
          columns={[
            {
              header: t('account.table.request'),
              cell: (node) => (
                <div className="flex flex-col">
                  <span className="font-medium">{t(`gdpr.requestType.${node.type}`)}</span>
                  {node.message && <span className="text-small text-muted">{node.message}</span>}
                </div>
              ),
            },
            {header: t('account.table.date'), cell: (node) => <DateText value={node.createdAt} />},
            {
              header: t('account.table.status'),
              cell: (node) =>
                node.processedAt ? (
                  <Badge variant="success">
                    {t('account.table.handled')}&nbsp;
                    <DateText value={node.processedAt} />
                  </Badge>
                ) : (
                  <Badge variant="neutral">{t('account.table.waiting')}</Badge>
                ),
            },
          ]}
        />
      ) : (
        <p className="text-muted">{t('account.privacyRequests.none')}</p>
      )}
    </AccountSection>
  );
}

const GDPR_REQUESTS_QUERY = `#graphql
  fragment AccountGdprRequest on GdprRequest {
    id
    type
    message
    createdAt
    processedAt
  }
  query AccountGdprRequests($customerAccessToken: String!, $first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    shop {
      gdprRequestTypes
    }
    customer(customerAccessToken: $customerAccessToken) {
      gdprRequests(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...AccountGdprRequest
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
