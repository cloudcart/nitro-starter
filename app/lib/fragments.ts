// The cart as the whole app reads it: `context.cart.get()` returns this shape.
// Fields: the `Cart` type of the Storefront API schema.
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 {
    currencyCode
    amount
    formatted
  }
  fragment CartLine on CartLine {
    id
    quantity
    title
    allowQuantityChange
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      id
      title
      # With the SKU, the analytics' item id: the same as the product view's when there is no SKU (B-457).
      sku
      barcode
      minimumQuantity
      price {
        ...Money
      }
      image {
        url
        altText
        width
        height
      }
      product {
        id
        handle
        title
        vendor
        # The line's picture when its variant has none of its own (B-359).
        featuredImage {
          url
          altText
          width
          height
        }
      }
      selectedOptions {
        name
        value
      }
    }
    options {
      name
      value
      price {
        ...Money
      }
    }
    discountAllocations {
      title
      code
      discountedAmount {
        ...Money
      }
    }
    warnings {
      code
      message
    }
    bundle {
      id
      title
      quantity
      product {
        handle
      }
    }
  }
  fragment CartApiQuery on Cart {
    updatedAt
    id
    checkoutUrl
    totalQuantity
    lines(first: $numCartLines) {
      nodes {
        ...CartLine
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalSavedAmount {
        ...Money
      }
    }
    discountApplications {
      key
      title
      code
      totalAllocatedAmount {
        ...Money
      }
      endsAt
    }
    totals {
      group
      key
      name
      description
      afterTotal
      amount {
        ...Money
      }
    }
    messages {
      messageHtml
    }
    discountCodes {
      code
      applicable
    }
  }
` as const;

/**
 * What a cart mutation answers with: the cart as `CART_QUERY_FRAGMENT` reads it, so the page shows the answer with no
 * request for the cart (`useLatestCart`).
 */
export const CART_MUTATE_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    ...CartApiQuery
  }
  ${CART_QUERY_FRAGMENT}
` as const;

// A product as listings show it: categories, search, brands, tags, the home page.
export const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment ProductItemMoney on MoneyV2 {
    amount
    currencyCode
    formatted
  }
  fragment ProductItemImage on Image {
    altText
    url
    width
    height
  }
  fragment ProductItemVariant on ProductVariant {
    id
    # With the SKU, the analytics' item id: the same as the product view's when there is no SKU (B-457).
    sku
    barcode
    availableForSale
    currentlyNotInStock
    statusType
    statusName
    minimumQuantity
    price {
      ...ProductItemMoney
    }
    compareAtPrice {
      ...ProductItemMoney
    }
  }
  fragment ProductItem on Product {
    id
    handle
    title
    vendor
    availableForSale
    productType
    options {
      name
      type
      values
      optionValues {
        name
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
        firstSelectableVariant {
          ...ProductItemVariant
          image {
            ...ProductItemImage
          }
        }
      }
    }
    featuredImage {
      ...ProductItemImage
    }
    images(first: 5) {
      nodes {
        ...ProductItemImage
      }
    }
    labels {
      name
      color
      textColor
    }
    discount {
      percent
      hideDiscountPrice
    }
    priceRange {
      minVariantPrice {
        ...ProductItemMoney
      }
      maxVariantPrice {
        ...ProductItemMoney
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: [], ignoreUnknownOptions: true) {
      ...ProductItemVariant
      image {
        ...ProductItemImage
      }
    }
    reviewSummary {
      averageRating
      totalCount
    }
  }
` as const;

// A listing's facets: what the visitor can narrow the products by. No counts: the storefront shows none,
// and a listing that does not ask for them is not charged for the counting (sf, T-222).
export const LISTING_FILTER_FRAGMENT = `#graphql
  fragment ListingFilter on Filter {
    id
    label
    type
    position
    minValue {
      value
      currencyCode
    }
    maxValue {
      value
    }
    values {
      id
      label
      input
      swatchColor
      swatchImage
    }
  }
` as const;

// What a buyer accepts when placing an order, as the store's checkout asks it.
export const ORDER_CONSENTS_FRAGMENT = `#graphql
  fragment OrderConsents on CheckoutLegalSettings {
    gdprActive
    termsPages {
      id
      title
      handle
    }
    gdprPolicies {
      id
      form
      title
      handle
      required
    }
  }
` as const;

export type OrderConsent = {id: string; title: string; handle?: string | null; required: boolean};

/**
 * The consents an order asks for: with the GDPR app, its policies for the order
 * and the marketing opt-in; without it, the merchant's terms pages, all required.
 * The checkout never shows both.
 */
export function orderConsents(legal: {
  gdprActive: boolean;
  termsPages: Array<{id: string; title: string; handle?: string | null}>;
  gdprPolicies: Array<{id: string; form: string; title: string; handle?: string | null; required: boolean}>;
}): OrderConsent[] {
  if (legal.gdprActive) {
    return legal.gdprPolicies
      .filter((policy) => policy.form === 'SUBMIT_PAYMENT' || policy.form === 'MARKETING')
      .map(({id, title, handle, required}) => ({id, title, handle, required}));
  }

  return legal.termsPages.map(({id, title, handle}) => ({id, title, handle, required: true}));
}

// The policies a form asks the visitor to accept: pages the merchant attached to it in the GDPR app.
export const POLICY_FRAGMENT = `#graphql
  fragment FormPolicy on Policy {
    id
    page {
      title
      handle
    }
    forms {
      form
      required
    }
  }
` as const;

/*
 * A user error's fields, one fragment for each error type the starter's mutations return (B-204). They match
 * `FormError` (`~/components/FormFields`), which every form reads. The cart's own mutations go through Nitrogen's
 * cart handler; the fast order returns `CartUserError` and selects it here: codegen reads only the app's documents.
 */
export const FORM_USER_ERROR_FRAGMENT = `#graphql
  fragment FormUserErrorFields on FormUserError {
    field
    message
    code
  }
` as const;

export const CUSTOMER_USER_ERROR_FRAGMENT = `#graphql
  fragment CustomerUserErrorFields on CustomerUserError {
    field
    message
    code
  }
` as const;

export const RETURN_USER_ERROR_FRAGMENT = `#graphql
  fragment ReturnUserErrorFields on ReturnUserError {
    field
    message
    code
  }
` as const;

export const CART_USER_ERROR_FRAGMENT = `#graphql
  fragment CartUserErrorFields on CartUserError {
    field
    message
    code
  }
` as const;
