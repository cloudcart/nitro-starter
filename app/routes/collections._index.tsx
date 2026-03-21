import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import type {Collection} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitro | Collections'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const collections = await ctx.storefront.getCollections();
  return {collections};
}

export default function CollectionsIndex() {
  const {collections} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1 className="section-heading">Collections</h1>
      <div className="collections-grid">
        {collections.map((collection) => (
          <Link key={collection.id} to={`/collections/${collection.handle}`} className="collection-card" prefetch="intent">
            {collection.image ? (
              <Image data={collection.image} alt={collection.title} />
            ) : (
              <div style={{aspectRatio: '3/1.5', background: 'var(--color-gray-100)', borderRadius: 12}} />
            )}
            <h3>{collection.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
