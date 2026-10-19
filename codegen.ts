import type {CodegenConfig} from '@graphql-codegen/cli';
import {getSchema, pluckConfig, preset} from '@cloudcart/nitrogen-codegen';

/**
 * Types every `#graphql` query in the app from the CloudCart Storefront API
 * schema, and registers each with `storefront.query()` / `storefront.mutate()`,
 * so the data a loader receives is typed from the query itself.
 *
 * Run `npm run codegen` after changing a query.
 */
export default {
  overwrite: true,
  pluckConfig,
  generates: {
    'storefrontapi.generated.d.ts': {
      preset,
      schema: getSchema('storefront'),
      documents: ['./*.{ts,tsx,js,jsx}', './app/**/*.{ts,tsx,js,jsx}'],
    },
  },
} satisfies CodegenConfig;
