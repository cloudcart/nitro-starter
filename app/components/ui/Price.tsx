import {ProductPrice, type ProductPriceProps} from '@cloudcart/nitrogen-react';

/**
 * A product's price on nitrogen-react's `ProductPrice`, in the storefront's look: a reduced price stays in the
 * foreground, the price before it is muted and struck through, and the unit price is small print on its own
 * line. The text is the store's own (`Money` prints the API's `formatted`).
 */
export function Price(
  props: Omit<ProductPriceProps, 'salePriceClassName' | 'compareAtClassName' | 'unitPriceClassName' | 'classNames'>,
) {
  return (
    <ProductPrice
      classNames={{
        sale: 'text-foreground',
        compareAt: 'text-price-before font-normal text-muted',
        unitPrice: 'block text-small font-normal text-muted',
      }}
      {...props}
    />
  );
}
