import type {GdprRequestType} from '@cloudcart/nitrogen/storefront-api-types';

/**
 * The GDPR request types, in the store's order, with their slugs in `/gdpr/request/{slug}`. Their names are the
 * `gdpr.requestType.{TYPE}` texts; where a policy was accepted is `gdpr.policyForm.{FORM}`.
 */
export const GDPR_REQUEST_TYPES: Array<{type: GdprRequestType; slug: string}> = [
  {type: 'INFO', slug: 'info'},
  {type: 'DOWNLOAD', slug: 'download'},
  {type: 'DELETE', slug: 'delete'},
  {type: 'MARKETING_UNSUBSCRIBE', slug: 'marketing_unsubscribe'},
];

/**
 * The request types the store takes: a setting the merchant edits, read with `CacheSettings()` by the GDPR page and
 * each request's form through this one document, so they share its cache entry (B-407).
 */
export const GDPR_REQUEST_TYPES_QUERY = `#graphql
  query GdprRequestTypes {
    shop {
      gdprRequestTypes
    }
  }
` as const;
