import type {CustomerDataExportKind} from '@cloudcart/nitrogen/storefront-api-types';
import type {Route} from './+types/gdpr.download.$kind';

/** The platform's download addresses → the file each one gives. */
const KINDS: Record<string, CustomerDataExportKind> = {
  'personal-information': 'PERSONAL_INFORMATION',
  addresses: 'ADDRESSES',
  orders: 'ORDERS',
};

/**
 * /gdpr/download/{personal-information|addresses|orders} — a copy of the
 * signed-in customer's data, the file the API gives (`Customer.dataExport`),
 * served as a download. A resource route: it has no page.
 */
export async function loader({params, context}: Route.LoaderArgs) {
  const kind = KINDS[params.kind];
  if (!kind) throw new Response('Not found', {status: 404});

  await context.customerAccount.handleAuthStatus();
  const {customer} = await context.customerAccount.query(DATA_EXPORT_QUERY, {variables: {kind}});
  const file = customer?.dataExport;
  if (!file) throw new Response('Not found', {status: 404});

  return new Response(file.content, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

const DATA_EXPORT_QUERY = `#graphql
  query CustomerDataExport($customerAccessToken: String!, $kind: CustomerDataExportKind!) {
    customer(customerAccessToken: $customerAccessToken) {
      dataExport(kind: $kind) {
        filename
        contentType
        content
      }
    }
  }
` as const;
