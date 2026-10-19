import type {ListProductPayload} from '@cloudcart/nitrogen';
import type {ProductItemFragment} from 'storefrontapi.generated';

/**
 * The products a listing shows, in order, for the list events of the merchant's marketing pixels
 * (`Analytics.CollectionView`, `VendorView`, `TagView`, `SearchView`): each by the variant its card shows.
 */
export function listedProducts(products: ProductItemFragment[]): ListProductPayload[] {
  return products.map((product) => {
    const variant = product.selectedOrFirstAvailableVariant;
    return {
      id: product.id,
      title: product.title,
      price: (variant?.price ?? product.priceRange.minVariantPrice).amount,
      vendor: product.vendor,
      variantId: variant?.id,
      sku: variant?.sku,
      barcode: variant?.barcode,
      productType: product.productType,
    };
  });
}
