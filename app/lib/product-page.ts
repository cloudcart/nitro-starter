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
