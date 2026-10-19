import type {Route} from './+types/[robots.txt]';
import {LLMS_TXT_QUERY} from '~/lib/llms-txt';

/**
 * The storefront's robots.txt. The sitemap is the platform's: on the store's
 * own domain CloudCart answers /sitemap.xml and /sitemap/… itself (they are
 * never routed to the storefront), listing the same addresses this starter
 * uses. On the preview host and in development there is none, so no sitemap
 * is named there.
 *
 * Only the platform's checkout is disallowed. The cart, the account and the
 * sign-in pages carry `noindex`, which a crawler reads only on a page it may
 * fetch (B-263).
 */
export async function loader({url, context}: Route.LoaderArgs) {
  const {shop} = await context.storefront.query(LLMS_TXT_QUERY, {cache: context.storefront.CacheSettings()});
  const onStoreDomain = url.hostname === context.env.PUBLIC_STORE_DOMAIN.toLowerCase();

  const body = [
    'User-agent: *',
    'Disallow: /checkout',
    '',
    ...(onStoreDomain ? [`Sitemap: ${url.origin}/sitemap.xml`] : []),
    ...(shop.llmsTxt ? [`Llms: ${url.origin}/llms.txt`] : []),
    '',
  ].join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
