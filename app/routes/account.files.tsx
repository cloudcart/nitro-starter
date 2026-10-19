import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/account.files';
import {metaTranslator, privateMeta} from '~/lib/meta';
import type {AccountDownloadFragment} from 'storefrontapi.generated';
import {AccountSection} from '~/components/AccountSection';
import {PaginatedTable} from '~/components/DataTable';
import {buttonClass, ButtonLink} from '~/components/ui/Button';
import {formatBytes} from '~/lib/format';
import {productPath} from '~/lib/urls';
import {EmptyState} from '~/components/ui/EmptyState';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('account.nav.downloads'));

/**
 * /account/files — the digital files from the customer's orders. Each link
 * works for 15 minutes after the page loads.
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const {customer, errors} = await context.customerAccount.query(DOWNLOADS_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 25}),
  });
  if (!customer) throw missingResource(errors, 'Customer not found');

  return {downloads: customer.downloads};
}

export default function Downloads() {
  const {t, language} = useTranslation();
  const {downloads} = useLoaderData<typeof loader>();

  return (
    <AccountSection title={t('account.nav.downloads')}>
      {downloads.nodes.length ? (
        <PaginatedTable<AccountDownloadFragment>
          caption={t('account.nav.downloads')}
          connection={downloads}
          rowKey={(file) => file.id}
          columns={[
            {
              header: t('account.table.file'),
              cell: (file) => <span className="font-medium break-all">{file.fileName}</span>,
            },
            {
              header: t('account.table.product'),
              cell: (file) =>
                file.productHandle ? (
                  <Link to={productPath(file.productHandle)} className="inline-link">
                    {file.productTitle}
                  </Link>
                ) : (
                  file.productTitle
                ),
            },
            {
              header: t('account.table.order'),
              cell: (file) => (
                <span className="whitespace-nowrap">{t('account.order.number', {number: file.orderNumber})}</span>
              ),
            },
            {
              header: t('account.table.size'),
              cell: (file) => (file.fileSize > 0 ? formatBytes(file.fileSize, language) : null),
              align: 'end',
            },
            {
              header: t('account.table.download'),
              // A plain link: the file comes straight from the store.
              cell: (file) => (
                <a href={file.downloadUrl} download className={buttonClass('secondary')}>
                  {t('account.table.download')}
                  <span className="sr-only">: {file.fileName}</span>
                </a>
              ),
              align: 'end',
            },
          ]}
        />
      ) : (
        <EmptyState
          text={t('account.downloads.none')}
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

const DOWNLOADS_QUERY = `#graphql
  fragment AccountDownload on CustomerDownload {
    id
    fileName
    fileSize
    productTitle
    productHandle
    orderNumber
    downloadUrl
  }
  query AccountDownloads(
    $customerAccessToken: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) {
    customer(customerAccessToken: $customerAccessToken) {
      downloads(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...AccountDownload
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
