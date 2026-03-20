import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Money, Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.collection ? d.collection.title + ' | Nitro' : 'Collection | Nitro'});

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
      <h1>{collection.title}</h1>
      <p>{collection.description}</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'1.5rem',marginTop:'1rem'}}>
        {collection.products?.nodes.map((p) => (
          <Link key={p.id} to={`/products/${p.handle}`} style={{textDecoration:'none',color:'inherit'}}>
            <Image data={p.featuredImage} alt={p.title} />
            <h3>{p.title}</h3>
            <Money data={p.priceRange.minVariantPrice} />
          </Link>
        ))}
      </div>
    </div>
  );
}
