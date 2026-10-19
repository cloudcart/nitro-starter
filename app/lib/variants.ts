import {useMemo} from 'react';
import type {SelectedOption} from '@cloudcart/nitrogen/storefront-api-types';
import {productPath} from '~/lib/urls';

/** A product's URL with a variant's options selected, e.g. `/product/shirt?Size=M`. */
export function useVariantUrl(handle: string, selectedOptions?: Pick<SelectedOption, 'name' | 'value'>[]) {
  return useMemo(
    () => getVariantUrl({handle, searchParams: new URLSearchParams(), selectedOptions}),
    [handle, selectedOptions],
  );
}

export function getVariantUrl({
  handle,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  searchParams: URLSearchParams;
  selectedOptions?: Pick<SelectedOption, 'name' | 'value'>[];
}) {
  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const searchString = searchParams.toString();

  return productPath(handle) + (searchString ? `?${searchString}` : '');
}

/**
 * The price before the discount to show beside a variant's price: none when the merchant hides it for the product's
 * discount (`discount.hideDiscountPrice`). Every price of a product goes through it — the page, its sticky bar and the
 * cards (B-197).
 */
export function shownCompareAtPrice<T>(
  compareAtPrice: T | null | undefined,
  discount: {hideDiscountPrice: boolean} | null | undefined,
): T | null {
  return discount?.hideDiscountPrice ? null : (compareAtPrice ?? null);
}

/**
 * A chosen quantity within a variant's own limits: at least the least the store sells of it (`minimumQuantity`), at
 * most what is in stock (`quantityAvailable`, when the store tells it). A quantity chosen for another variant is
 * brought inside them (B-196). The add to cart and the fast order send the same amount (B-209).
 */
export function quantityWithin(
  variant: {minimumQuantity?: number | null; quantityAvailable?: number | null} | null | undefined,
  quantity: number,
) {
  const minimum = variant?.minimumQuantity ?? 1;
  const maximum = variant?.quantityAvailable ?? undefined;
  return {minimum, maximum, amount: Math.max(minimum, maximum === undefined ? quantity : Math.min(quantity, maximum))};
}
