import {createRequestListener} from '@react-router/node';
import {createNitroContext} from '@cloudcart/nitro';

export default createRequestListener({
  // @ts-expect-error — virtual module
  build: () => import('virtual:react-router/server-build'),
  mode: process.env.NODE_ENV,
  getLoadContext: async (request) => {
    return createNitroContext({
      request,
      env: {
        SESSION_SECRET: process.env.SESSION_SECRET ?? 'nitro-dev-secret',
        PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN,
        PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN,
        PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN,
      },
    });
  },
});
