import type {IGraphQLConfig} from 'graphql-config';
import {getSchema} from '@cloudcart/nitrogen-codegen';

/**
 * GraphQL Config, for editors: autocompletion and validation of the `#graphql`
 * queries against the CloudCart Storefront API schema.
 * @see https://the-guild.dev/graphql/config/docs/user/usage
 */
export default {
  projects: {
    default: {
      schema: getSchema('storefront'),
      documents: ['./*.{ts,tsx,js,jsx}', './app/**/*.{ts,tsx,js,jsx}'],
    },
    // Add your own GraphQL projects here, e.g. for a CMS.
  },
} satisfies IGraphQLConfig;
