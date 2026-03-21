import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';
import {ProductFilters} from '~/components/ProductFilters';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.collection ? `${d.collection.title} | Nitro` : 'Collection | Nitro',
  description: d?.collection?.description,
});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const collection = await ctx.storefront.getCollection(params.handle);
  if (!collection) throw data('Collection not found', {status: 404});

  // Parse filter params from URL
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort');
  const vendor = url.searchParams.get('vendor');
  const tag = url.searchParams.get('tag');
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const available = url.searchParams.get('available');

  // Get products — in a real implementation, these params would be passed
  // to the storefront.query() with ProductFilter inputs
  let products = collection.products?.nodes ?? [];

  // Client-side filtering for mock data (server-side when using real API)
  if (available === 'true') {
    products = products.filter((p) => p.variants.nodes.some((v) => v.availableForSale));
  }
  if (minPrice) {
    const min = parseFloat(minPrice);
    products = products.filter((p) => parseFloat(p.priceRange.minVariantPrice.amount) >= min);
  }
  if (maxPrice) {
    const max = parseFloat(maxPrice);
    products = products.filter((p) => parseFloat(p.priceRange.minVariantPrice.amount) <= max);
  }

  // Sorting
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

  // Extract available filter options from products
  const allProducts = collection.products?.nodes ?? [];
  const vendors = [...new Set(allProducts.map((p) => (p as any).vendor).filter(Boolean))];
  const tags = [...new Set(allProducts.flatMap((p) => (p as any).tags ?? []))];
  const options: {name: string; values: string[]}[] = [];

  // Collect unique option values
  const optionMap = new Map<string, Set<string>>();
  for (const p of allProducts) {
    for (const opt of p.options) {
      if (!optionMap.has(opt.name)) optionMap.set(opt.name, new Set());
      for (const val of opt.values) optionMap.get(opt.name)!.add(val);
    }
  }
  for (const [name, values] of optionMap) {
    options.push({name, values: [...values]});
  }

  return {
    collection,
    products,
    filters: {vendors, tags, options},
    activeFilters: {sort, vendor, tag, minPrice, maxPrice, available},
  };
}

export default function CollectionPage() {
  const {collection, products, filters} = useLoaderData<typeof loader>();

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="section-heading">{collection.title}</h1>
        {collection.description && (
          <p className="collection-description">{collection.description}</p>
        )}
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
