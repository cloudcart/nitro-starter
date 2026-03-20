import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Money, Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitro | Home'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const products = await ctx.storefront.getProducts(4);
  return {products};
}

export default function Homepage() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Welcome to Nitro</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'1.5rem',marginTop:'1rem'}}>
        {products.map((p) => (
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
