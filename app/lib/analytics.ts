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
      // The brand's id beside its name and handle: a brand chosen in the listing's filter, by its handle, is known at once.
      ...(product.vendorDetails?.id
        ? {
            signal: {
              id: product.id,
              vendorId: product.vendorDetails.id,
              vendorName: product.vendor,
              vendorHandle: product.vendorDetails.handle,
            },
          }
        : {}),
      variantId: variant?.id,
      sku: variant?.sku,
      barcode: variant?.barcode,
      productType: product.productType,
    };
  });
}
