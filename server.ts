import {createRequestHandler} from 'react-router';
import {createNitroContext} from '@cloudcart/nitro';

const handler = createRequestHandler(
  // @ts-expect-error — virtual module provided by React Router at build time
  () => import('virtual:react-router/server-build'),
  'production',
);

export default {
  async fetch(request: Request, env: Record<string, string>) {
    try {
      const context = await createNitroContext({
        request,
        env: {
          SESSION_SECRET: env.SESSION_SECRET ?? 'nitro-dev-secret',
          PUBLIC_STORE_DOMAIN: env.PUBLIC_STORE_DOMAIN,
          PUBLIC_STOREFRONT_API_TOKEN: env.PUBLIC_STOREFRONT_API_TOKEN,
          PRIVATE_STOREFRONT_API_TOKEN: env.PRIVATE_STOREFRONT_API_TOKEN,
        },
      });

      const response = await handler(request, context);

      if (context.session.isPending) {
        response.headers.set('Set-Cookie', await context.session.commit());
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
