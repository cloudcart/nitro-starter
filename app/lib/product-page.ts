import {getSelectedProductOptions} from '@cloudcart/nitrogen';
import type {Route} from '../routes/+types/product.$handle';
import {ORDER_CONSENTS_FRAGMENT, POLICY_FRAGMENT} from '~/lib/fragments';
import {REVIEWS_SECTION_DISPLAY_FRAGMENT} from '~/components/ProductReviews';

/**
 * The store's settings the product page's forms and reviews follow. Store-wide, so no product page waits on it once
 * cached: fresh for a minute, then served while it refreshes in the background — an admin change shows within about a
 * minute. Both routes of the page ask it (`routes/product.tsx` for its reviews, `routes/product.$handle.tsx` for its
 * forms): the same query in flight is sent once, so the page makes one call.
 */
export function loadProductPageSettings({context}: Pick<Route.LoaderArgs, 'context'>) {
  const {storefront} = context;
  return storefront.query(PRODUCT_PAGE_SETTINGS_QUERY, {
    cache: storefront.CacheSettings(),
  });
}

/**
 * The product's option names, for `getSelectedProductOptions`: asked only when the address has parameters, so a
 * campaign's (`utm_source`, `gclid`) are left out and the page asks the bare address's queries (B-544). Admin-edited:
 * cached as the store's settings. Both of the page's loaders ask it (the product and its extras): one call in flight.
 */
export async function loadOptionNames(
  {context, request}: Pick<Route.LoaderArgs, 'context' | 'request'>,
  handle: string,
): Promise<string[] | undefined> {
  if (getSelectedProductOptions(request).length === 0) return undefined;
  const {storefront} = context;
  const {product} = await storefront.query(PRODUCT_OPTION_NAMES_QUERY, {
    variables: {handle},
    cache: storefront.CacheSettings(),
  });
  return product?.options.map((option) => option.name) ?? [];
}

const PRODUCT_OPTION_NAMES_QUERY = `#graphql
  query ProductOptionNames($handle: String!) {
    product(handle: $handle) {
      options {
        name
      }
    }
  }
` as const;

const PRODUCT_PAGE_SETTINGS_QUERY = `#graphql
  fragment ProductFastOrder on FastOrderSettings {
    buttonTitle
    finishButtonTitle
    descriptionHtml
    successMessageHtml
    phoneRequired
    firstNameRequired
    lastNameRequired
    trackingEvents {
      checkout
      purchase
    }
  }
  query ProductPageSettings {
    shop {
      backInStockChannels
    }
    fastOrderSettings {
      ...ProductFastOrder
    }
    checkoutSettings {
      legal {
        ...OrderConsents
      }
    }
    policies {
      ...FormPolicy
    }
    productReviewSettings {
      ...ReviewsSectionDisplay
    }
  }
  ${POLICY_FRAGMENT}
  ${ORDER_CONSENTS_FRAGMENT}
  ${REVIEWS_SECTION_DISPLAY_FRAGMENT}
` as const;
