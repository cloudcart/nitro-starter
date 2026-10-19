import type {ComponentProps} from 'react';
import {Translated} from '@cloudcart/nitrogen';
import {Price} from '~/components/ui/Price';
import {shownCompareAtPrice} from '~/lib/variants';

type Money = NonNullable<ComponentProps<typeof Price>['price']>;

/**
 * A card's price — the listing's card and the linked products' carousel (T-550). Prices that differ: "From" the lowest
 * (`minVariantPrice`), with no price before it, which would be one variant's and need not be the cheapest's (B-208);
 * the discount's badge shows the sale. Otherwise the variant's price over the one before it, unless the merchant hides
 * that (`shownCompareAtPrice`). `fixed`: a value chosen on the card prices it at its variant.
 */
export function CardPrice({
  priceRange,
  variant,
  discount,
  fixed = false,
}: {
  priceRange: {minVariantPrice: Money; maxVariantPrice: Money};
  variant: {price: Money; compareAtPrice?: Money | null} | null | undefined;
  discount: {hideDiscountPrice: boolean} | null | undefined;
  fixed?: boolean;
}) {
  const {minVariantPrice, maxVariantPrice} = priceRange;

  if (!fixed && minVariantPrice.amount !== maxVariantPrice.amount) {
    return (
      <span className="text-muted">
        <Translated
          message="product.fromPrice"
          values={{price: <Price price={minVariantPrice} className="text-foreground" />}}
        />
      </span>
    );
  }
  return (
    <Price
      price={variant?.price ?? minVariantPrice}
      compareAtPrice={shownCompareAtPrice(variant?.compareAtPrice, discount)}
    />
  );
}
