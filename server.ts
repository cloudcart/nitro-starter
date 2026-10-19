import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect, type ExecutionContext} from '@cloudcart/nitrogen';
import {createNitrogenRouterContext} from '~/lib/context';

/**
 * The storefront's worker. Every request goes through here — in development
 * too, where Nitrogen's Vite plugin runs this same file.
 */
export default {
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
