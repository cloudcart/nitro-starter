import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/products._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Money, Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitro | Products'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const products = await ctx.storefront.getProducts();
  return {products};
}

export default function ProductsIndex() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Products</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'1.5rem'}}>
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
