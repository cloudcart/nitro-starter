import {Link} from 'react-router';
import type {Product} from '@cloudcart/nitrogen';
import {Image, Money} from '@cloudcart/nitrogen-react';
import {StarRating} from './StarRating';
import {WishlistButton} from './WishlistButton';

export function ProductCard({product, loading}: {product: Product; loading?: 'eager' | 'lazy'}) {
  const p = product as any;
  const labels: Array<{name: string; color?: string; textColor?: string}> = p.labels ?? [];
  const reviewSummary = p.reviewSummary;

  return (
    <Link to={`/products/${product.handle}`} className="group block text-inherit transition-transform duration-150 hover:no-underline hover:-translate-y-0.5" prefetch="intent">
      <div className="relative overflow-hidden rounded-[10px]">
        {product.featuredImage?.url ? (
          <Image
            data={product.featuredImage}
            alt={product.title}
            loading={loading}
            className="aspect-square object-cover w-full rounded-[10px] bg-gray-100"
          />
        ) : (
          <img src="/noimage.svg" alt={product.title} loading={loading} className="aspect-square object-cover w-full rounded-[10px] bg-gray-100" />
        )}
        {product.availableForSale === false && (
          <span className="absolute top-2 right-2 py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider leading-none bg-gray-600 text-white">Sold Out</span>
        )}
        <div className="absolute bottom-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <WishlistButton productId={product.id} size="md" />
        </div>
        {labels.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {labels.map((label) => (
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
      <h4 className="text-sm font-semibold mt-3 leading-tight">{product.title}</h4>
      {reviewSummary && reviewSummary.totalCount > 0 && (
        <div className="mt-1">
          <StarRating rating={reviewSummary.averageRating} count={reviewSummary.totalCount} size="sm" />
        </div>
      )}
      <span className="text-[0.85rem] text-gray-500 mt-1 block">
        <Money data={product.priceRange.minVariantPrice} />
      </span>
    </Link>
  );
}
