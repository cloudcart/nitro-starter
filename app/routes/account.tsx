import {Outlet, useLoaderData} from 'react-router';
import type {Route} from './+types/account';
import {useTranslation} from '@cloudcart/nitrogen';
import {AccountSidebar} from '~/components/AccountSidebar';

export const meta: Route.MetaFunction = () => [{name: 'robots', content: 'noindex'}];

export function shouldRevalidate() {
  return true;
}

/** /account — the signed-in customer's area. Signed-out visitors are sent to sign in. */
export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  await customerAccount.handleAuthStatus();

  const {customer, shop, errors} = await customerAccount.query(CUSTOMER_QUERY);
  if (errors?.length || !customer) {
    throw new Error('Customer not found');
  }

  // The privacy pages exist only while the store runs the GDPR app.
  const hasPrivacyPages = shop.gdprRequestTypes.length > 0;

  return {customer, hasPrivacyPages};
}

export default function AccountLayout() {
  const {t} = useTranslation();
  const {customer, hasPrivacyPages} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-10 md:px-gutter-md">
      <h1 className="text-title">
        {customer.firstName ? t('account.welcome', {name: customer.firstName}) : t('account.title')}
      </h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[var(--container-account-nav)_minmax(0,1fr)] lg:gap-12">
        <AccountSidebar hasPrivacyPages={hasPrivacyPages} />
        <div className="min-w-0">
          <Outlet context={{customer}} />
        </div>
      </div>
    </div>
  );
}

const CUSTOMER_QUERY = `#graphql
  query AccountCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      email
      phone
      acceptsMarketing
    }
    shop {
      gdprRequestTypes
    }
  }
` as const;
