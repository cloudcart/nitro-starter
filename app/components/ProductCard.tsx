import {Link} from 'react-router';
import type {Product} from '@cloudcart/nitro';
import {Image, Money} from '@cloudcart/nitro-react';

export function ProductCard({product, loading}: {product: Product; loading?: 'eager' | 'lazy'}) {
  const p = product as any;
  const labels: Array<{name: string; color?: string; textColor?: string}> = p.labels ?? [];

  return (
    <Link to={`/products/${product.handle}`} className="product-card" prefetch="intent">
      <div className="product-card-image">
        {product.featuredImage?.url ? (
          <Image
            data={product.featuredImage}
            alt={product.title}
            loading={loading}
          />
        ) : (
          <img src="/noimage.svg" alt={product.title} loading={loading} />
        )}
        {product.availableForSale === false && (
          <span className="badge badge-soldout">Sold Out</span>
        )}
        {labels.length > 0 && (
          <div className="product-card-badges">
            {labels.map((label) => (
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
      <h4>{product.title}</h4>
      <span className="price">
        <Money data={product.priceRange.minVariantPrice} />
      </span>
    </Link>
  );
}
