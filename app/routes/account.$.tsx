import type {Route} from './+types/account.$';

/**
 * An address under /account that does not exist: sign in first, as every account page asks, then a 404, which
 * `storefrontRedirect` in server.ts may turn into the merchant's redirect from an old address (B-406).
 */
export async function loader({url, context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();
  throw new Response(`${url.pathname} not found`, {status: 404});
}

/** Never shown: the loader always throws. A component keeps the route a page, so the 404 is the store's own page. */
export default function AccountCatchAllPage() {
  return null;
}
