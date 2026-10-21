import {AppSession, createNitrogenContext, type ExecutionContext} from '@cloudcart/nitrogen';
import {CART_MUTATE_FRAGMENT, CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

// Services of your own for every loader and action — a CMS client, a reviews
// API… They are available as `context.propertyName`.
const additionalContext = {} as const;

type AdditionalContextType = typeof additionalContext;

declare global {
  interface NitrogenAdditionalContext extends AdditionalContextType {}

  // `context.cart.get()` and every cart mutation return the cart in the shape
  // of the app's own fragment (`CART_QUERY_FRAGMENT`).
  interface NitrogenCustomCartFragment extends CartApiQueryFragment {}
}

/**
 * The request's Nitrogen context: the storefront client, cart, customer
 * account and session, for every loader, action and middleware.
 */
export async function createNitrogenRouterContext(request: Request, env: Env, executionContext: ExecutionContext) {
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([caches.open('nitrogen'), AppSession.init(request, [env.SESSION_SECRET])]);

  return createNitrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      // Signed-out visitors are sent here, the CloudCart storefront's sign-in page.
      customerAccount: {loginPath: '/auth/login'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
        mutateFragment: CART_MUTATE_FRAGMENT,
      },
    },
    additionalContext,
  );
}
