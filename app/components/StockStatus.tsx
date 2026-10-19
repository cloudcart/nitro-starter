import {useTranslation} from '@cloudcart/nitrogen';
import type {ProductVariant} from '@cloudcart/nitrogen/storefront-api-types';

/**
 * The variant's stock status, in the merchant's own words when they set them: on the product page, and on a card under
 * its price. The dot: grey when it cannot be bought, whatever its status's type (B-380); green in stock; amber to order.
 */
export function StockStatus({
  variant,
  className = '',
}: {
  className?: string;
  variant?: Pick<ProductVariant, 'statusType' | 'statusName' | 'availableForSale' | 'currentlyNotInStock'> | null;
}) {
  const {t} = useTranslation();
  if (!variant) return null;

  const tone = !variant.availableForSale
    ? 'bg-muted'
    : variant.statusType === 'IN_STOCK' && !variant.currentlyNotInStock
      ? 'bg-success'
      : 'bg-warning';
  const fallback = variant.availableForSale
    ? variant.currentlyNotInStock
      ? t('product.availableToOrder')
      : t('product.inStock')
    : t('product.outOfStock');

  return (
    <p className={`flex items-center gap-2 text-small ${className}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${tone}`} />
      {variant.statusName || fallback}
    </p>
  );
}
