import type {PageCacheRouteHandle} from '@cloudcart/nitrogen';

/**
 * The `handle` of a route whose page is the same for every visitor who is not signed in: it is served whole from
 * Cloudflare's cache (`server.ts`), and the visitor's own parts come from `/visitor` in the browser. A route that
 * reads anything of the visitor's but a signed-in customer's (`getBuyer()`), or answers a form, must not have it.
 */
export const SHARED_PAGE = {pageCache: true} as const satisfies PageCacheRouteHandle;
