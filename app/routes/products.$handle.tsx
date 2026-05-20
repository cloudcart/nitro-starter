import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, generateProductJsonLd} from '@cloudcart/nitrogen';
import {Image, RichText, useOptimisticVariant, Money} from '@cloudcart/nitrogen-react';
import {ArrowDownTrayIcon} from '@heroicons/react/24/outline';
import {ProductForm} from '~/components/ProductForm';
import {ProductImageGallery} from '~/components/ProductImageGallery';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {StarRating} from '~/components/StarRating';
import {WishlistButton} from '~/components/WishlistButton';
import {ReviewList} from '~/components/ReviewList';

export const meta: Route.MetaFunction = ({data: d}) => {
  const product = d?.product;
  if (!product) return getSeoMeta({title: 'Product | Nitrogen'});

  const url = `/products/${product.handle}`;
  return [
    ...getSeoMeta({
      title: product.seo?.title || `${product.title} | Nitrogen`,
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
    linkedProducts: (product as any).linkedProducts?.nodes ?? [],
    collections: (product as any).collections?.nodes ?? [],
  };
}

export default function ProductPage() {
  const {product, linkedProducts, collections} = useLoaderData<typeof loader>();
  const firstVariant = product.variants.nodes[0];
  const {selectedVariant} = useOptimisticVariant(product, firstVariant);
  const variant = selectedVariant ?? firstVariant;

  return (
    <div className="max-w-7xl">
      <ProductBreadcrumbs product={product} collections={collections} />

      <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16">
        <ProductMedia product={product} variant={variant} />
        <ProductDetails product={product} variant={variant} />
      </div>

      {/* Reviews */}
      {(product as any).reviewSummary && (
        <ReviewList
          reviews={(product as any).reviews?.nodes ?? []}
          summary={(product as any).reviewSummary}
          totalCount={(product as any).reviews?.totalCount ?? (product as any).reviewSummary?.totalCount ?? 0}
        />
      )}

      {linkedProducts.length > 0 && (
        <LinkedProducts products={linkedProducts} />
      )}
    </div>
  );
}

/* --- Product Media (Left Column) --- */

function ProductMedia({product, variant}: {product: any; variant: any}) {
  const isOnSale = variant?.compareAtPrice &&
    parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);
  const labels: Array<{name: string; color?: string; textColor?: string}> = product.labels ?? [];

  return (
    <div className="relative">
      <div className="relative md:sticky md:top-[calc(4rem+1.5rem)]">
        <div className="absolute top-3 right-3 z-[2]">
          <WishlistButton productId={product.id} size="lg" />
        </div>
        <div className="absolute top-3 left-3 z-[2] flex flex-wrap gap-1.5">
          {product.isNew && <span className="py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-brand text-white">New</span>}
          {product.isFeatured && <span className="py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-amber-500 text-white">Featured</span>}
          {isOnSale && <span className="py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-red-600 text-white">Sale</span>}
          {product.availableForSale === false && <span className="py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-gray-600 text-white">Sold Out</span>}
          {labels
            .filter((l) => !['New', 'Featured'].includes(l.name))
            .map((label) => (
              <span
                key={label.name}
                className="py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-gray-600 text-white"
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

/* --- Product Details (Right Column) --- */

function ProductDetails({product, variant}: {product: any; variant: any}) {
  const properties: Array<{name: string; values: string[]}> = product.properties ?? [];
  const files: Array<{id: string; name: string; filename: string; url: string; fileSize: number}> =
    product.files?.nodes ?? [];

  return (
    <div className="self-start">
      {/* Vendor */}
      {product.vendor && (
        <Link to={`/products?vendor=${product.vendor}`} className="inline-block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 hover:text-brand hover:no-underline">
          {product.vendor}
        </Link>
      )}

      <h1 className="text-[1.75rem] md:text-[2rem] font-bold tracking-tight leading-tight">{product.title}</h1>

      {/* Rating */}
      {product.reviewSummary && product.reviewSummary.totalCount > 0 && (
        <div className="mt-2">
          <StarRating rating={product.reviewSummary.averageRating} count={product.reviewSummary.totalCount} size="md" />
        </div>
      )}

      {/* Product Form: Price + Variants + Add to Cart */}
      <ProductForm product={product} selectedVariant={variant} />

      {/* SKU */}
      {variant?.sku && (
        <div className="mt-4 text-xs text-gray-400 tracking-wide">SKU: {variant.sku}</div>
      )}

      {/* Description */}
      <RichText data={product.descriptionHtml} className="prose prose-sm prose-gray mt-8 pt-6 border-t border-gray-100 max-w-none" />

      {/* Specifications */}
      {properties.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-[0.85rem] font-bold uppercase tracking-wider mb-3 text-dark">Specifications</h3>
          <table className="w-full border-collapse">
            <tbody>
              {properties.map((prop) => (
                <tr key={prop.name}>
                  <td className="py-2.5 text-[0.85rem] border-b border-gray-100 text-gray-500 w-[40%] font-medium">{prop.name}</td>
                  <td className="py-2.5 text-[0.85rem] border-b border-gray-100 text-dark">{prop.values.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Downloads */}
      {files.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-[0.85rem] font-bold uppercase tracking-wider mb-3 text-dark">Downloads</h3>
          <ul className="list-none flex flex-col gap-2">
            {files.map((file) => (
              <li key={file.id}>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-[0.85rem] text-dark transition-all duration-150 hover:bg-gray-100 hover:border-gray-400 hover:no-underline">
                  <DownloadIcon />
                  {file.name || file.filename}
                  {file.fileSize > 0 && (
                    <span className="text-gray-400 text-xs ml-auto">{formatFileSize(file.fileSize)}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-6">
          {product.tags.map((tag: string) => (
            <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="py-1 px-2.5 bg-gray-100 rounded-full text-xs text-gray-600 transition-all duration-150 hover:bg-gray-200 hover:text-dark hover:no-underline">
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Shipping Info */}
      {variant?.weight && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Weight: {variant.weight} {(variant.weightUnit ?? 'kg').toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}

/* --- Related Products --- */

function LinkedProducts({products}: {products: any[]}) {
  return (
    <section className="mt-16 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold tracking-tight mb-5">You may also like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((p: any) => (
          <Link key={p.id} to={`/products/${p.handle}`} className="block text-inherit transition-transform duration-150 hover:no-underline hover:-translate-y-0.5" prefetch="intent">
            <div className="relative overflow-hidden rounded-[10px]">
              {p.featuredImage?.url ? <Image data={p.featuredImage} alt={p.title} className="aspect-square object-cover w-full rounded-[10px] bg-gray-100" /> : <img src="/noimage.svg" alt={p.title} className="aspect-square object-cover w-full rounded-[10px] bg-gray-100" />}
              {p.availableForSale === false && (
                <span className="absolute top-2 right-2 py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-gray-600 text-white">Sold Out</span>
              )}
              {p.labels?.length > 0 && (
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {p.labels.map((label: any) => (
                    <span
                      key={label.name}
                      className="py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-gray-600 text-white"
                      style={label.color ? {backgroundColor: label.color, color: label.textColor || '#fff'} : undefined}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <h4 className="text-sm font-semibold mt-3 leading-tight">{p.title}</h4>
            <span className="text-[0.85rem] text-gray-500 mt-1 block"><Money data={p.priceRange.minVariantPrice} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* --- Breadcrumbs --- */

function ProductBreadcrumbs({product, collections}: {product: any; collections: any[]}) {
  const items = [];
  if (collections?.[0]) {
    items.push({title: collections[0].title, to: `/collections/${collections[0].handle}`});
  }
  items.push({title: product.title});
  return <Breadcrumbs items={items} />;
}

/* --- Helpers --- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DownloadIcon() {
  return <ArrowDownTrayIcon className="size-4 shrink-0 text-gray-400" />;
}
