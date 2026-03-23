import {createRequestHandler} from 'react-router';
import {createNitroContext} from '@cloudcart/nitro';

const handler = createRequestHandler(
  // @ts-expect-error — virtual module provided by React Router at build time
  () => import('virtual:react-router/server-build'),
  'production',
);

/** Content-Type mapping for static assets. */
const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

interface Env {
  SESSION_SECRET?: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  ASSETS?: KVNamespace;
  WORKER_NAME?: string;
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      const url = new URL(request.url);

      // Serve static assets from Workers KV
      if (env.ASSETS && env.WORKER_NAME) {
        const path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

        if (path && (path.startsWith('assets/') || path.includes('.'))) {
          const key = `${env.WORKER_NAME}/${path}`;
          const value = await env.ASSETS.get(key, {type: 'arrayBuffer'});

          if (value) {
            const isHashed = path.startsWith('assets/');
            return new Response(value, {
              headers: {
                'Content-Type': getMimeType(path),
                'Cache-Control': isHashed
                  ? 'public, max-age=31536000, immutable'
                  : 'public, max-age=3600',
              },
            });
          }
        }
      }

      // SSR — React Router handles everything else
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
