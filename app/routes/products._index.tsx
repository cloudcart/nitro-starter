import {useLoaderData} from 'react-router';
import type {Route} from './+types/products._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitrogen';
import {ProductCard} from '~/components/ProductCard';
import {ProductFilters} from '~/components/ProductFilters';
import {Pagination} from '~/components/Pagination';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'All Products | Nitrogen'});

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
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-5">All Products</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-[220px_1fr] md:gap-10">
        <aside className="order-2 md:order-1">
          <ProductFilters filters={(products as any).filters} totalCount={(products as any).totalCount} />
        </aside>

        <div className="order-1 md:order-2">
          <Pagination connection={products}>
            {({nodes, NextLink, isLoading}) => (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {nodes.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <NextLink className="flex items-center justify-center w-full py-3 px-6 my-6 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg no-underline transition-[background,color,border-color] duration-150 hover:bg-gray-100 hover:border-gray-400 hover:text-dark hover:no-underline">
                  {isLoading ? 'Loading...' : 'Load more \u2193'}
                </NextLink>
              </div>
            )}
          </Pagination>
        </div>
      </div>
    </div>
  );
}
