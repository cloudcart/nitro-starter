import {useLoaderData, data, Link, useNavigate} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, generateProductJsonLd} from '@cloudcart/nitro';
import {Image, ProductPrice, RichText, VariantSelector, useOptimisticVariant, Money} from '@cloudcart/nitro-react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ProductImageGallery} from '~/components/ProductImageGallery';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {OptionSwatch} from '~/components/OptionSwatch';

export const meta: Route.MetaFunction = ({data: d}) => {
  const product = d?.product;
  if (!product) return getSeoMeta({title: 'Product | Nitro'});

  const url = `/products/${product.handle}`;
  return [
    ...getSeoMeta({
      title: product.seo?.title || `${product.title} | Nitro`,
      description: product.seo?.description || product.description,
      type: 'product',
      ...(product.featuredImage
        ? {image: {url: product.featuredImage.url, width: product.featuredImage.width, height: product.featuredImage.height}}
        : {}),
    }),
    {'script:ld+json': generateProductJsonLd(product, url)},
  ];
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const product = await ctx.storefront.getProduct(params.handle);
  if (!product) throw data('Product not found', {status: 404});

  return {
    product,
    relatedProducts: (product as any).relatedProducts?.nodes ?? [],
    collections: (product as any).collections?.nodes ?? [],
  };
}

export default function ProductPage() {
  const {product, relatedProducts, collections} = useLoaderData<typeof loader>();
  const firstVariant = product.variants.nodes[0];
  const {selectedVariant} = useOptimisticVariant(product, firstVariant);
  const variant = selectedVariant ?? firstVariant;

  return (
    <div className="product-page-wrapper">
      <ProductBreadcrumbs product={product} collections={collections} />

      <div className="product-page">
        <ProductMedia product={product} variant={variant} />
        <ProductDetails product={product} variant={variant} />
      </div>

      {relatedProducts.length > 0 && (
        <RelatedProducts products={relatedProducts} />
      )}
    </div>
  );
}

/* ─── Product Media (Left Column) ────────────────────────────────────── */

function ProductMedia({product, variant}: {product: any; variant: any}) {
  const isOnSale = variant?.compareAtPrice &&
    parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);
  const labels: Array<{name: string; color?: string; textColor?: string}> = product.labels ?? [];

  return (
    <div className="product-media">
      <div className="product-media-sticky">
        <div className="product-badges">
          {product.isNew && <span className="badge badge-new">New</span>}
          {product.isFeatured && <span className="badge badge-featured">Featured</span>}
          {isOnSale && <span className="badge badge-sale">Sale</span>}
          {product.availableForSale === false && <span className="badge badge-soldout">Sold Out</span>}
          {labels
            .filter((l) => !['New', 'Featured'].includes(l.name))
            .map((label) => (
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
          images={product.images?.nodes ?? []}
          featuredImage={product.featuredImage}
        />
      </div>
    </div>
  );
}

/* ─── Product Details (Right Column) ─────────────────────────────────── */

function ProductDetails({product, variant}: {product: any; variant: any}) {
  const hasMultiplePrices =
    product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount;
  const isOnSale = variant?.compareAtPrice &&
    parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);

  const properties: Array<{name: string; values: string[]}> = product.properties ?? [];
  const files: Array<{id: string; name: string; filename: string; url: string; fileSize: number}> =
    product.files?.nodes ?? [];

  return (
    <div className="product-details">
      {/* Vendor */}
      {product.vendor && (
        <Link to={`/products?vendor=${product.vendor}`} className="product-vendor">
          {product.vendor}
        </Link>
      )}

      <h1 className="product-title">{product.title}</h1>

      {/* Price */}
      <div className="product-price-display" aria-live="polite">
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

      {/* Stock */}
      {variant && <StockIndicator variant={variant} />}

      {/* Variant Selector */}
      <VariantSelector product={product}>
        {(options) =>
          options.map(({name, values}) => {
            const optionMeta = getOptionMeta(product, name);
            const optionType = optionMeta.type;
            const activeValue = values.find((v) => v.isActive);

            return (
              <fieldset key={name} className="product-options">
                <legend>
                  {name}
                  {activeValue && <span className="option-active-value">: {activeValue.value}</span>}
                </legend>

                {optionType === 'select' ? (
                  <OptionSelect name={name} values={values} />
                ) : (
                  <div className={`option-values${optionType === 'color' ? ' option-values-swatches' : ''}`}>
                    {values.map((o) => {
                      const valueMeta = optionMeta.values[o.value];
                      return (
                        <OptionSwatch
                          key={o.value}
                          option={o}
                          type={optionType}
                          color={valueMeta?.color}
                          swatchUrl={valueMeta?.swatchUrl}
                        />
                      );
                    })}
                  </div>
                )}
              </fieldset>
            );
          })
        }
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
      {variant?.sku && (
        <div className="product-sku">SKU: {variant.sku}</div>
      )}

      {/* Description */}
      <RichText data={product.descriptionHtml} className="product-description" />

      {/* Specifications */}
      {properties.length > 0 && (
        <div className="product-section">
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

      {/* Downloads */}
      {files.length > 0 && (
        <div className="product-section">
          <h3 className="product-section-title">Downloads</h3>
          <ul className="files-list">
            {files.map((file) => (
              <li key={file.id}>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-link">
                  <DownloadIcon />
                  {file.name || file.filename}
                  {file.fileSize > 0 && (
                    <span className="file-size">{formatFileSize(file.fileSize)}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div className="product-tags">
          {product.tags.map((tag: string) => (
            <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="product-tag">
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Shipping Info */}
      {variant?.weight && (
        <div className="product-shipping-info">
          <span className="shipping-detail">
            Weight: {variant.weight} {(variant.weightUnit ?? 'kg').toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Stock Indicator ────────────────────────────────────────────────── */

function StockIndicator({variant}: {variant: any}) {
  if (!variant.availableForSale) {
    return (
      <div className="product-stock">
        <span className="stock-out">Out of stock</span>
      </div>
    );
  }

  if (variant.currentlyNotInStock) {
    return (
      <div className="product-stock">
        <span className="stock-preorder">Available for pre-order</span>
      </div>
    );
  }

  if (variant.quantityAvailable != null && variant.quantityAvailable > 0 && variant.quantityAvailable <= 5) {
    return (
      <div className="product-stock">
        <span className="stock-low">Only {variant.quantityAvailable} left!</span>
      </div>
    );
  }

  return (
    <div className="product-stock">
      <span className="stock-in">In stock</span>
    </div>
  );
}

/* ─── Option Select Dropdown ─────────────────────────────────────────── */

function OptionSelect({name, values}: {name: string; values: any[]}) {
  const navigate = useNavigate();
  const activeValue = values.find((v) => v.isActive);

  return (
    <select
      className="option-select"
      value={activeValue?.value ?? ''}
      aria-label={name}
      onChange={(e) => {
        const selected = values.find((v) => v.value === e.target.value);
        if (selected) {
          navigate(selected.to, {replace: true, preventScrollReset: true});
        }
      }}
    >
      {values.map((o) => (
        <option key={o.value} value={o.value} disabled={!o.available}>
          {o.value}{!o.available ? ' (Sold out)' : ''}
        </option>
      ))}
    </select>
  );
}

/* ─── Related Products ───────────────────────────────────────────────── */

function RelatedProducts({products}: {products: any[]}) {
  return (
    <section className="related-products">
      <h2 className="section-heading">You may also like</h2>
      <div className="products-grid">
        {products.map((p: any) => (
          <Link key={p.id} to={`/products/${p.handle}`} className="product-card" prefetch="intent">
            <div className="product-card-image">
              {p.featuredImage && <Image data={p.featuredImage} alt={p.title} />}
              {p.availableForSale === false && (
                <span className="badge badge-soldout">Sold Out</span>
              )}
              {p.labels?.length > 0 && (
                <div className="product-card-badges">
                  {p.labels.map((label: any) => (
                    <span
                      key={label.name}
                      className="badge badge-custom"
                      style={label.color ? {backgroundColor: label.color, color: label.textColor || '#fff'} : undefined}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <h4>{p.title}</h4>
            <span className="price"><Money data={p.priceRange.minVariantPrice} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Breadcrumbs ────────────────────────────────────────────────────── */

function ProductBreadcrumbs({product, collections}: {product: any; collections: any[]}) {
  const items = [];
  if (collections?.[0]) {
    items.push({title: collections[0].title, to: `/collections/${collections[0].handle}`});
  }
  items.push({title: product.title});
  return <Breadcrumbs items={items} />;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

/**
 * Extract option type, color, and swatch metadata from variant selectedOptions.
 */
function getOptionMeta(product: any, optionName: string) {
  const values: Record<string, {color?: string; swatchUrl?: string}> = {};
  let type: string | undefined;

  for (const variant of product.variants.nodes) {
    for (const so of variant.selectedOptions) {
      if (so.name !== optionName) continue;
      if (so.type && !type) type = so.type;
      if (!values[so.value]) {
        values[so.value] = {
          color: so.color || undefined,
          swatchUrl: so.swatchUrl || undefined,
        };
      }
    }
  }

  return {type, values};
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" />
    </svg>
  );
}
