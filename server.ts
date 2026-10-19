import * as serverBuild from 'virtual:react-router/server-build';
import {
  AppSession,
  createPageCache,
  createRequestHandler,
  hasSignedInCustomer,
  storefrontRedirect,
  type ExecutionContext,
} from '@cloudcart/nitrogen';
import {createNitrogenRouterContext} from '~/lib/context';

/**
 * The storefront's app. Every request reaches it through the page cache's
 * gateway below — in development too, where Nitrogen's Vite plugin runs this
 * same file.
 */
const app = {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    try {
      const nitrogenContext = await createNitrogenRouterContext(request, env, executionContext);

      /**
       * Nitrogen's request handler serves the Storefront API at /api/sf and
       * delegates everything else to React Router.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => nitrogenContext,
        // Only the store's own domain is indexed: a preview host answers with `X-Robots-Tag: noindex` (B-262).
        storeDomain: env.PUBLIC_STORE_DOMAIN,
      });

      const response = await handleRequest(request);

      if (nitrogenContext.session.isPending) {
        response.headers.set('Set-Cookie', await nitrogenContext.session.commit());
      }

      if (response.status === 404) {
        /**
         * Only for a 404 from the app: if the merchant set up a redirect for
         * this path in the CloudCart admin, `storefrontRedirect` follows it;
         * otherwise it passes the 404 through.
         */
        return storefrontRedirect({request, response, storefront: nitrogenContext.storefront});
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};

/**
 * Pages the same for every visitor — the routes whose `handle` has
 * `pageCache: true` — are served whole from Cloudflare's cache, rendered
 * without the visitor's cookies; their cart and forms come from `/visitor` in
 * the browser. A signed-in customer's pages are always rendered for them: their
 * customer group has its own prices and collections.
 */
const pageCache = createPageCache(app, {
  build: serverBuild,
  async isPersonal(request, env: Env) {
    try {
      return hasSignedInCustomer(await AppSession.init(request, [env.SESSION_SECRET]));
    } catch {
      // A session that cannot be read (no `SESSION_SECRET`): the app answers it, with the error, uncached.
      return true;
    }
  },
});

/** The entrypoint Cloudflare caches; the platform turns its cache on when it uploads the storefront. */
export const NitrogenPageCache = pageCache.entrypoint;

export default pageCache.gateway;
