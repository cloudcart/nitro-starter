import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {PaginatedResourceSection, Image} from '@cloudcart/nitro-react';
import {ProductCard} from '~/components/ProductCard';
import {ProductFilters} from '~/components/ProductFilters';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';

export const meta: Route.MetaFunction = ({data: d}) => {
  const col = d?.collection as any;
  return getSeoMeta({
    title: col?.seo?.title || (col ? `${col.title} | Nitro` : 'Category | Nitro'),
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
    <div className="collection-page">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="collection-header">
        <h1 className="section-heading">{collection.title}</h1>
        {collection.description && (
          <p className="collection-description">{collection.description}</p>
        )}
      </div>

      {/* Subcategories */}
      {showChildren && (
        <div className="subcategories">
          {children.map((child: any) => (
            <Link key={child.id} to={`/collections/${child.handle}`} className="subcategory-card" prefetch="intent">
              {child.image?.url ? (
                <Image data={child.image} alt={child.title} />
              ) : (
                <img src="/noimage.svg" alt={child.title} />
              )}
              <span className="subcategory-title">{child.title}</span>
              {child.productsCount != null && (
                <span className="subcategory-count">{child.productsCount}</span>
              )}
            </Link>
          ))}
        </div>
      )}

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
