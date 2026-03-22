import {useLoaderData} from 'react-router';
import type {Route} from './+types/products._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';
import {ProductFilters} from '~/components/ProductFilters';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitro | All Products'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);

  const sort = url.searchParams.get('sort');
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const available = url.searchParams.get('available');

  let products = await ctx.storefront.getProducts(50);

  // Filter
  if (available === 'true') {
    products = products.filter((p) => p.variants.nodes.some((v) => v.availableForSale));
  }
  if (minPrice) {
    products = products.filter((p) => parseFloat(p.priceRange.minVariantPrice.amount) >= parseFloat(minPrice));
  }
  if (maxPrice) {
    products = products.filter((p) => parseFloat(p.priceRange.minVariantPrice.amount) <= parseFloat(maxPrice));
  }

  // Sort
  if (sort) {
    products = [...products];
    switch (sort) {
      case 'price-asc':
        products.sort((a, b) => parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount));
        break;
      case 'price-desc':
        products.sort((a, b) => parseFloat(b.priceRange.minVariantPrice.amount) - parseFloat(a.priceRange.minVariantPrice.amount));
        break;
      case 'title-asc':
        products.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        products.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
  }

  // Extract filter options
  const allProducts = await ctx.storefront.getProducts(50);
  const optionMap = new Map<string, Set<string>>();
  for (const p of allProducts) {
    for (const opt of p.options) {
      if (!optionMap.has(opt.name)) optionMap.set(opt.name, new Set());
      for (const val of opt.values) optionMap.get(opt.name)!.add(val);
    }
  }
  const options = [...optionMap].map(([name, values]) => ({name, values: [...values]}));

  return {products, filters: {vendors: [], tags: [], options}};
}

export default function ProductsIndex() {
  const {products, filters} = useLoaderData<typeof loader>();

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="section-heading">All Products</h1>
      </div>

      <div className="collection-layout">
        <aside className="collection-sidebar">
          <ProductFilters availableFilters={filters} />
        </aside>

        <div className="collection-products">
          <p className="collection-count">{products.length} product{products.length !== 1 ? 's' : ''}</p>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="collection-empty">
              <p>No products match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
