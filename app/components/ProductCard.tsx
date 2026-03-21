import {Link} from 'react-router';
import type {Product} from '@cloudcart/nitro';
import {Image, Money} from '@cloudcart/nitro-react';

export function ProductCard({product, loading}: {product: Product; loading?: 'eager' | 'lazy'}) {
  return (
    <Link to={`/products/${product.handle}`} className="product-card" prefetch="intent">
      <Image
        data={product.featuredImage}
        alt={product.title}
        loading={loading}
      />
      <h4>{product.title}</h4>
      <span className="price">
        <Money data={product.priceRange.minVariantPrice} />
      </span>
    </Link>
  );
}
