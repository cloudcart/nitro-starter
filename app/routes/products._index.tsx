import {useLoaderData} from 'react-router';
import type {Route} from './+types/products._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {PaginatedResourceSection} from '@cloudcart/nitro-react';
import {ProductCard} from '~/components/ProductCard';
import {ProductFilters} from '~/components/ProductFilters';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'All Products | Nitro'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);

  const products = await ctx.storefront.getProductsPaginated({
    ...paginationVariables,
    sortKey,
    reverse,
    filters,
  });

  return {products};
}

export default function ProductsIndex() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="section-heading">All Products</h1>
      </div>

      <div className="collection-layout">
        <aside className="collection-sidebar">
          <ProductFilters />
        </aside>

        <div className="collection-products">
          <PaginatedResourceSection connection={products} resourcesClassName="products-grid">
            {(product) => <ProductCard key={product.id} product={product} />}
          </PaginatedResourceSection>
        </div>
      </div>
    </div>
  );
}
