import type {Route} from '../routes/+types/product.$handle';
import {loadSelectedOptions} from '~/lib/product-page';

/**
 * A product's extras for the variant the address's options pick: the credit plans for its price and the store's shops
 * that have it, below the fold. The page renders without them if they fail (null). A product page's document streams
 * them (`routes/product.$handle.tsx`); a page opened in the browser asks them as it opens
 * (`routes/product-extras.$handle.tsx`, `useProductExtras`), so its route data — what a link's hover or a swipe loads
 * ahead — is the product alone.
 */
export function loadProductExtras({context, request}: Pick<Route.LoaderArgs, 'context' | 'request'>, handle: string) {
  const {storefront, customerAccount} = context;
  return Promise.all([customerAccount.getBuyer(), loadSelectedOptions({context, request}, handle)])
    .then(([buyer, selectedOptions]) =>
      storefront.query(PRODUCT_EXTRAS_QUERY, {
        variables: {handle, selectedOptions, buyer},
      }),
    )
    .catch((error: Error) => {
      console.error(error);
      return null;
    });
}

const PRODUCT_EXTRAS_QUERY = `#graphql
  query ProductExtras(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        creditOffers {
          provider {
            handle
            title
            imageUrl
          }
          plans {
            months
            monthlyPayment {
              amount
              currencyCode
              formatted
            }
          }
        }
      }
      stockByStore {
        store {
          id
          name
          urlHandle
          city
        }
      }
    }
  }
` as const;
