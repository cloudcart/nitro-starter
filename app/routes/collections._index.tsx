import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import {Pagination} from '~/components/Pagination';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Categories | Nitrogen'});

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
      <h1 className="text-2xl font-bold tracking-tight mb-5">Categories</h1>
      <Pagination connection={collections}>
        {({nodes, NextLink, isLoading}) => (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {nodes.map((collection: any) => (
                <Link
                  key={collection.id}
                  to={`/collections/${collection.handle}`}
                  className="block relative rounded-xl overflow-hidden hover:no-underline"
                  prefetch="intent"
                >
                  {collection.color && (
                    <span className="absolute top-0 left-0 right-0 h-[3px] z-[1]" style={{backgroundColor: collection.color}} />
                  )}
                  {collection.image?.url ? (
                    <Image data={collection.image} alt={collection.title} className="aspect-[2/1] object-cover w-full rounded-xl transition-transform duration-300 hover:scale-[1.03]" />
                  ) : (
                    <img src="/noimage.svg" alt={collection.title} className="aspect-[2/1] object-cover w-full bg-gray-100 rounded-xl" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 py-4 px-5 bg-gradient-to-t from-black/70 to-transparent text-white rounded-b-xl">
                    <h3 className="text-lg font-bold text-white">{collection.title}</h3>
                    {collection.productsCount != null && (
                      <span className="text-xs opacity-70">
                        {collection.productsCount} {collection.productsCount === 1 ? 'product' : 'products'}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <NextLink className="flex items-center justify-center w-full py-3 px-6 my-6 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg no-underline transition-[background,color,border-color] duration-150 hover:bg-gray-100 hover:border-gray-400 hover:text-dark hover:no-underline">
              {isLoading ? 'Loading...' : 'Load more \u2193'}
            </NextLink>
          </div>
        )}
      </Pagination>
    </div>
  );
}
