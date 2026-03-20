import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
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
      <h1>Collections</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1.5rem'}}>
        {collections.map((c) => (
          <Link key={c.id} to={`/collections/${c.handle}`} style={{textDecoration:'none',color:'inherit'}}>
            <Image data={c.image} alt={c.title} />
            <h3>{c.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
