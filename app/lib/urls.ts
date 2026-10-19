import {parseGid} from '@cloudcart/nitrogen';

/*
 * The storefront's addresses are the CloudCart storefront's own, so links,
 * search rankings and the merchant's redirects carry over unchanged.
 */

export const productPath = (handle: string) => `/product/${handle}`;
export const vendorPath = (handle: string) => `/vendor/${handle}`;
export const productTagPath = (handle: string) => `/tags/${handle}`;
export const pagePath = (handle: string) => `/page/${handle}`;
export const articlePath = (handle: string) => `/article/${handle}`;
export const blogPath = (handle: string) => `/blog/category/${handle}`;
export const articleTagPath = (handle: string) => `/blog/tag/${handle}`;
export const storePath = (handle: string) => `/store/${handle}`;
export const bundleCategoryPath = (handle: string) => `/bundles/category/${handle}`;
/** A phone link, with the number's spaces and dashes left out. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** The sign-in page, coming back afterwards to `returnTo`, a path on this storefront (B-455). */
export const signInPath = (returnTo?: string | null) =>
  returnTo ? `/auth/login?${new URLSearchParams({redirect: returnTo})}` : '/auth/login';

/** The registration page, keeping the sign-in's way back. */
export const registerPath = (returnTo?: string | null) =>
  returnTo ? `/auth/register?${new URLSearchParams({redirect: returnTo})}` : '/auth/register';
/** A customer's order in their account, from its global id. */
export const orderPath = (id: string) => `/account/order-view/${parseGid(id).id}`;

/**
 * A collection's address: the path of its `onlineStoreUrl` — /category/{handle}
 * for a category, /selection/{handle} for a smart collection. The API knows
 * which a collection is; its `id` is not to be read for it.
 */
export function collectionPath(collection: {onlineStoreUrl?: string | null}) {
  // The API gives no address only to a collection without a handle, which has no page.
  return collection.onlineStoreUrl ? new URL(collection.onlineStoreUrl).pathname : '/categories';
}

/**
 * The address to link to for a URL the API returns (a menu item's, for
 * example): the path alone when it is on this store, so the link stays in the
 * app; the full URL when it points elsewhere.
 */
export function storefrontLink(
  url: string,
  {primaryDomainUrl, publicStoreDomain}: {primaryDomainUrl?: string; publicStoreDomain?: string},
) {
  try {
    const parsed = new URL(url);
    const hosts = [primaryDomainUrl && new URL(primaryDomainUrl).host, publicStoreDomain].filter(Boolean);
    return hosts.includes(parsed.host) ? `${parsed.pathname}${parsed.search}${parsed.hash}` : url;
  } catch {
    return url;
  }
}
