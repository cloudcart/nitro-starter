import type {StorefrontApiErrors} from '@cloudcart/nitrogen';

/**
 * What a loader throws when the resource its page shows came back null (B-413). A field that failed is null too, so
 * with the API's errors it is a failure — the error page, with the messages logged on the server — and only an answer
 * without errors says the resource is not there: a 404, which `storefrontRedirect` in server.ts may turn into the
 * merchant's redirect.
 *
 *   const {vendor, errors} = await context.storefront.query(VENDOR_QUERY, {…});
 *   if (!vendor) throw missingResource(errors, `Brand ${params.handle} not found`);
 */
export function missingResource(errors: StorefrontApiErrors, notFound: string | null): Error | Response {
  if (errors?.length) return new Error(errors.map(({message}) => message).join('\n'));
  return new Response(notFound, {status: 404});
}
