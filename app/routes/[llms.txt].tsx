import type {Route} from './+types/[llms.txt]';
import {LLMS_TXT_QUERY} from '~/lib/llms-txt';

/**
 * The store's llms.txt — what it tells AI assistants about itself — as the
 * merchant set it up in the CloudCart admin. 404 when the store publishes none.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {shop} = await context.storefront.query(LLMS_TXT_QUERY, {cache: context.storefront.CacheSettings()});

  if (!shop.llmsTxt) {
    throw new Response('Not found', {status: 404});
  }

  return new Response(shop.llmsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `max-age=${60 * 60}`,
    },
  });
}
