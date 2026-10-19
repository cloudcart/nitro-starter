import {data} from 'react-router';
import {subscribeFormAction} from '@cloudcart/nitrogen';
import type {Route} from './+types/subscribe-forms';
import {RouteErrorBoundary} from '~/components/RouteError';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

/** Only posted to: an address to open is not a page, so it answers the store's 404, never an empty page (B-438). */
export function loader({url}: Route.LoaderArgs) {
  throw new Response(`${url.pathname} not found`, {status: 404});
}

/**
 * What `<SubscribePopups>` posts: a form's view, counted when it opens, and the
 * visitor's answers. A visitor who sends a form becomes a subscriber in the
 * merchant's Marketing Suite. The forms themselves come with the root loader.
 */
export async function action({request, context}: Route.ActionArgs) {
  return data(
    await subscribeFormAction({request, storefront: context.storefront, customerAccount: context.customerAccount}),
  );
}
