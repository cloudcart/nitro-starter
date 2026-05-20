import type {Route} from './+types/[sitemap.xml]';
import {getContext} from '~/lib/context';
import {generateSitemap} from '@cloudcart/nitrogen';

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const origin = new URL(request.url).origin;
  const [products, collections] = await Promise.all([ctx.storefront.getProducts(100), ctx.storefront.getCollections(100)]);
  const entries = [
    {url: origin, changefreq: 'daily' as const, priority: 1.0},
    ...collections.map((c) => ({url: origin + '/collections/' + c.handle, changefreq: 'weekly' as const, priority: 0.7})),
    ...products.map((p) => ({url: origin + '/products/' + p.handle, changefreq: 'weekly' as const, priority: 0.6})),
  ];
  return new Response(generateSitemap(entries), {headers: {'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400'}});
}
