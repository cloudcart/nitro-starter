import {redirect} from 'react-router';
import type {Route} from './+types/auth.logout';
import {RouteErrorBoundary} from '~/components/RouteError';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

/** Opening /auth/logout does not sign anyone out: that takes a POST, so another site cannot do it with a link. */
export async function loader() {
  return redirect('/account');
}

/** Revokes the customer's token and clears it from the session. */
export async function action({context}: Route.ActionArgs) {
  await context.customerAccount.logout();
  return redirect('/');
}
