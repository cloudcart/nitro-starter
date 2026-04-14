import {createRequestHandler} from 'react-router';
import {createNitroContext} from '@cloudcart/nitro';

const handler = createRequestHandler(
  // @ts-expect-error — virtual module provided by React Router at build time
  () => import('virtual:react-router/server-build'),
  'production',
);

export default {
  async fetch(request: Request, env: Record<string, any>) {
    const url = new URL(request.url);

    // Serve static assets from KV — try every request, fall through to SSR if not found
    if (env.ASSETS) {
      const key = `${env.WORKER_NAME}${url.pathname}`;
      const {value, metadata} = await env.ASSETS.getWithMetadata(key, {type: 'arrayBuffer'});
      if (value) {
        return new Response(value, {
          headers: {
            'Content-Type': (metadata as any)?.contentType || 'application/octet-stream',
            'Cache-Control': url.pathname.startsWith('/assets/')
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600',
          },
        });
      }
    }

    // SSR handler — tokens come from env bindings, not process.env
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
    } catch (error: any) {
      console.error(error);
      // Temporary: expose error details for debugging
      const debug = {
        message: error?.message ?? String(error),
        name: error?.name,
        status: error?.status,
        graphqlErrors: error?.graphqlErrors,
        stack: error?.stack?.split('\n').slice(0, 10),
      };
      return new Response(
        '<!DOCTYPE html><html><head><title>Debug Error</title></head><body><h1>Server Error</h1><pre>' +
        JSON.stringify(debug, null, 2).replace(/</g, '&lt;') +
        '</pre></body></html>',
        {status: 500, headers: {'Content-Type': 'text/html; charset=utf-8'}},
      );
    }
  },
};
