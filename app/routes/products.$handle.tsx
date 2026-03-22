import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, generateProductJsonLd} from '@cloudcart/nitro';
import {Image, ProductPrice, RichText, VariantSelector, useOptimisticVariant, Money} from '@cloudcart/nitro-react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ProductImageGallery} from '~/components/ProductImageGallery';
import {Breadcrumbs} from '~/components/Breadcrumbs';

export const meta: Route.MetaFunction = ({data: d}) => {
  const product = d?.product;
  if (!product) return getSeoMeta({title: 'Product | Nitro'});

  const url = `/products/${product.handle}`;
  return [
    ...getSeoMeta({
      title: product.seo?.title || `${product.title} | Nitro`,
      description: product.seo?.description || product.description,
      type: 'product',
      ...(product.featuredImage ? {image: {url: product.featuredImage.url, width: product.featuredImage.width, height: product.featuredImage.height}} : {}),
    }),
    {'script:ld+json': generateProductJsonLd(product, url)},
  ];
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const product = await ctx.storefront.getProduct(params.handle);
  if (!product) throw data('Product not found', {status: 404});

  // Related products come directly from the API now
  const relatedProducts = (product as any).relatedProducts?.nodes ?? [];
  const collections = (product as any).collections?.nodes ?? [];

  return {product, relatedProducts, collections};
}

export default function ProductPage() {
  const {product, relatedProducts, collections} = useLoaderData<typeof loader>();
  const first = product.variants.nodes[0];
  const {selectedVariant} = useOptimisticVariant(product, first);
  const variant = selectedVariant ?? first;

  const p = product as any;
  const hasMultiplePrices = product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount;
  const isOnSale = variant?.compareAtPrice && parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);
  const labels: Array<{name: string; color?: string; textColor?: string}> = p.labels ?? [];
  const properties: Array<{name: string; values: string[]}> = p.properties ?? [];
  const files: Array<{id: string; name: string; filename: string; url: string; fileSize: number}> = p.files?.nodes ?? [];

  // Breadcrumb from collection
  const breadcrumbItems = [];
  if (collections?.[0]) {
    breadcrumbItems.push({title: collections[0].title, to: `/collections/${collections[0].handle}`});
  }
  breadcrumbItems.push({title: product.title});

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />

      <div className="product-page">
        {/* Left: Image Gallery */}
        <div className="product-image">
          <div className="product-badges">
            {p.isNew && <span className="badge badge-new">New</span>}
            {p.isFeatured && <span className="badge badge-featured">Featured</span>}
            {isOnSale && <span className="badge badge-sale">Sale</span>}
            {!product.availableForSale && <span className="badge badge-soldout">Sold Out</span>}
            {labels.filter((l: any) => !['New', 'Featured'].includes(l.name)).map((label: any) => (
              <span
                key={label.name}
                className="badge badge-custom"
                style={label.color ? {backgroundColor: label.color, color: label.textColor || '#fff'} : undefined}
              >
                {label.name}
              </span>
            ))}
          </div>
          <ProductImageGallery
            images={(product as any).images?.nodes ?? []}
            featuredImage={product.featuredImage}
          />
        </div>

        {/* Right: Product Info */}
        <div className="product-info">
          {/* Vendor */}
          {(product as any).vendor && (
            <Link to={`/products?vendor=${(product as any).vendor}`} className="product-vendor">
              {(product as any).vendor}
            </Link>
          )}

          <h1>{product.title}</h1>

          {/* Price */}
          <div className="product-price-display">
            {variant ? (
              <>
                <ProductPrice price={variant.price} compareAtPrice={variant.compareAtPrice} />
                {isOnSale && variant.compareAtPrice && (
                  <span className="product-savings">
                    Save {Math.round((1 - parseFloat(variant.price.amount) / parseFloat(variant.compareAtPrice.amount)) * 100)}%
                  </span>
                )}
              </>
            ) : hasMultiplePrices ? (
              <span>From <Money data={product.priceRange.minVariantPrice} /></span>
            ) : (
              <Money data={product.priceRange.minVariantPrice} />
            )}
          </div>

          {/* Stock indicator */}
          {variant && (
            <div className="product-stock">
              {!variant.availableForSale ? (
                <span className="stock-out">Out of stock</span>
              ) : (variant as any).currentlyNotInStock ? (
                <span className="stock-preorder">Available for pre-order</span>
              ) : (variant as any).quantityAvailable != null && (variant as any).quantityAvailable <= 5 && (variant as any).quantityAvailable > 0 ? (
                <span className="stock-low">Only {(variant as any).quantityAvailable} left!</span>
              ) : (
                <span className="stock-in">In stock</span>
              )}
            </div>
          )}

          {/* Variant Selector */}
          <VariantSelector product={product}>
            {(options) => options.map(({name, values}) => (
              <fieldset key={name} className="product-options">
                <legend>{name}</legend>
                <div className="option-values">
                  {values.map((o) => (
                    <Link
                      key={o.value}
                      to={o.to}
                      replace
                      preventScrollReset
                      prefetch="intent"
                      className={`option-value${o.isActive ? ' selected' : ''}${!o.available ? ' unavailable' : ''}`}
                    >
                      {o.value}
                    </Link>
                  ))}
                </div>
              </fieldset>
            ))}
          </VariantSelector>

          {/* Add to Cart */}
          {variant && (
            <AddToCartButton
              merchandiseId={variant.id}
              disabled={!variant.availableForSale}
              className="add-to-cart-btn"
            >
              {variant.availableForSale ? 'Add to Cart' : 'Sold Out'}
            </AddToCartButton>
          )}

          {/* SKU */}
          {variant && (variant as any).sku && (
            <div className="product-sku">SKU: {(variant as any).sku}</div>
          )}

          {/* Description */}
          <RichText data={product.descriptionHtml} className="product-description" />

          {/* Product Properties / Specifications */}
          {properties.length > 0 && (
            <div className="product-properties">
              <h3 className="product-section-title">Specifications</h3>
              <table className="properties-table">
                <tbody>
                  {properties.map((prop) => (
                    <tr key={prop.name}>
                      <td className="property-name">{prop.name}</td>
                      <td className="property-value">{prop.values.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Downloadable Files */}
          {files.length > 0 && (
            <div className="product-files">
              <h3 className="product-section-title">Downloads</h3>
              <ul className="files-list">
                {files.map((file) => (
                  <li key={file.id}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-link">
                      {file.name || file.filename}
                      {file.fileSize > 0 && (
                        <span className="file-size">({formatFileSize(file.fileSize)})</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {(product as any).tags?.length > 0 && (
            <div className="product-tags">
              {(product as any).tags.map((tag: string) => (
                <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="product-tag">
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Shipping Info */}
          {variant && (
            <div className="product-shipping-info">
              {(variant as any).weight && (
                <div className="shipping-detail">
                  Weight: {(variant as any).weight} {((variant as any).weightUnit ?? 'kg').toLowerCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <h2 className="section-heading">You may also like</h2>
          <div className="products-grid">
            {relatedProducts.map((p: any) => (
              <Link key={p.id} to={`/products/${p.handle}`} className="product-card" prefetch="intent">
                {p.featuredImage && <Image data={p.featuredImage} alt={p.title} />}
                <h4>{p.title}</h4>
                <span className="price"><Money data={p.priceRange.minVariantPrice} /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
