import {Outlet, useLoaderData} from 'react-router';
import type {Route} from './+types/account';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {AccountSidebar} from '~/components/AccountSidebar';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Account | Nitrogen'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus(); // throws redirect to /account/login
  const customer = await ctx.customerAccount.getCustomer();
  if (!customer) {
    // Token expired between isLoggedIn() and getCustomer(): bounce to login.
    ctx.customerAccount.handleAuthStatus();
  }
  return {customer};
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const greeting = customer?.firstName
    ? `Welcome back, ${customer.firstName}`
    : 'Your account';

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight mb-8">{greeting}</h1>
      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        <aside>
          <AccountSidebar />
        </aside>
        <div>
          <Outlet context={{customer}} />
        </div>
      </div>
    </div>
  );
}
