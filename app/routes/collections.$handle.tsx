import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.collection ? `${d.collection.title} | Nitro` : 'Collection | Nitro',
  description: d?.collection?.description,
});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const collection = await ctx.storefront.getCollection(params.handle);
  if (!collection) throw data('Collection not found', {status: 404});
  return {collection};
}

export default function CollectionPage() {
  const {collection} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1 className="section-heading">{collection.title}</h1>
      {collection.description && <p style={{color: 'var(--color-gray-500)', marginBottom: '1.5rem'}}>{collection.description}</p>}
      <div className="products-grid">
        {collection.products?.nodes.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
