import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Pagination, Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Categories | Nitro'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const paginationVariables = getPaginationVariables(request, {pageBy: 24});
  const collections = await ctx.storefront.getCollectionsPaginated(paginationVariables);
  return {collections};
}

export default function CollectionsIndex() {
  const {collections} = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="section-heading">Categories</h1>
      <Pagination connection={collections}>
        {({nodes, NextLink, isLoading}) => (
          <div>
            <div className="collections-grid">
              {nodes.map((collection: any) => (
                <Link
                  key={collection.id}
                  to={`/collections/${collection.handle}`}
                  className="collection-card"
                  prefetch="intent"
                  style={collection.color ? {'--collection-color': collection.color} as React.CSSProperties : undefined}
                >
                  {collection.image?.url ? (
                    <Image data={collection.image} alt={collection.title} />
                  ) : (
                    <img src="/noimage.svg" alt={collection.title} className="collection-card-placeholder" />
                  )}
                  <div className="collection-card-info">
                    <h3>{collection.title}</h3>
                    {collection.productsCount != null && (
                      <span className="collection-card-count">
                        {collection.productsCount} {collection.productsCount === 1 ? 'product' : 'products'}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <NextLink className="pagination-link pagination-next">
              {isLoading ? 'Loading...' : 'Load more ↓'}
            </NextLink>
          </div>
        )}
      </Pagination>
    </div>
  );
}
