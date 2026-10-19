import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {type EntryContext, type RouterContextProvider, ServerRouter} from 'react-router';
import {
  createContentSecurityPolicy,
  getMarketingPixels,
  marketingPixelScriptSources,
  nitrogenContext,
  NonceProvider,
} from '@cloudcart/nitrogen';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  // The pixels this store runs: the root loader's call, already answered, so no request of its own.
  const pixels = await getMarketingPixels({storefront: context.get(nitrogenContext.storefront)}).catch(() => null);

  /**
   * Scripts run only with the page's nonce, or from the hosts of the marketing
   * pixels this store runs (Google, Meta, TikTok; none for a store without
   * them, B-317). Images, media, frames
   * and fonts may come from any HTTPS address: product descriptions and pages
   * hold the merchant's own embeds (videos, maps) and images from their CDN.
   */
  const {nonce, header} = createContentSecurityPolicy({
    directives: {
      scriptSrc: ["'self'", ...marketingPixelScriptSources(pixels)],
      connectSrc: ["'self'", 'https:', ...(import.meta.env.DEV ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : [])],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ['https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider value={nonce}>
      <ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  // Crawlers get the whole page at once.
  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
