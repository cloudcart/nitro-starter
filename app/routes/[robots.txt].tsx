import {generateRobots} from '@cloudcart/nitro';

export function loader() {
  return new Response(generateRobots({
    rules: [{userAgent: '*', allow: ['/'], disallow: ['/admin', '/cart', '/account']}],
    sitemap: 'https://localhost/sitemap.xml',
  }), {headers: {'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400'}});
}
