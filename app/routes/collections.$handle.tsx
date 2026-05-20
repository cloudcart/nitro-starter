import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import {ProductCard} from '~/components/ProductCard';
import {ProductFilters} from '~/components/ProductFilters';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {Pagination} from '~/components/Pagination';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';

export const meta: Route.MetaFunction = ({data: d}) => {
  const col = d?.collection as any;
  return getSeoMeta({
    title: col?.seo?.title || (col ? `${col.title} | Nitrogen` : 'Category | Nitrogen'),
    description: col?.seo?.description || col?.description,
  });
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);

  const result = await ctx.storefront.getCollectionProductsPaginated(params.handle, {
    ...paginationVariables,
    sortKey,
    reverse,
    filters,
  });

  if (!result) throw data('Collection not found', {status: 404});

  return {collection: result.collection, products: result.products};
}

export default function CollectionPage() {
  const {collection, products} = useLoaderData<typeof loader>();
  const col = collection as any;
  const breadcrumbItems = (col.breadcrumb ?? [])
    .filter((b: any) => b.handle !== col.handle)
    .map((b: any) => ({title: b.title, to: `/collections/${b.handle}`}));
  breadcrumbItems.push({title: col.title});

  const children = col.children?.nodes ?? [];
  const showChildren = col.displayChildren && children.length > 0;

  return (
    <div className="w-full">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-5">{collection.title}</h1>
        {collection.description && (
          <p className="text-gray-500 max-w-xl">{collection.description}</p>
        )}
      </div>

      {/* Subcategories */}
      {showChildren && (
        <div className="flex gap-3 overflow-x-auto mb-8 pb-2 scrollbar-none">
          {children.map((child: any) => (
            <Link
              key={child.id}
              to={`/collections/${child.handle}`}
              className="flex items-center gap-2 shrink-0 py-1.5 pl-1.5 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-dark text-xs font-medium transition-[border-color,background] duration-150 hover:border-gray-400 hover:bg-gray-100 hover:no-underline"
              prefetch="intent"
            >
              {child.image?.url ? (
                <Image data={child.image} alt={child.title} className="size-7 rounded object-cover" />
              ) : (
                <img src="/noimage.svg" alt={child.title} className="size-7 rounded object-cover" />
              )}
              <span className="whitespace-nowrap">{child.title}</span>
              {child.productsCount != null && (
                <span className="text-gray-400 text-[0.7rem]">{child.productsCount}</span>
              )}
            </Link>
          ))}
        </div>
      )}

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
