import {useLoaderData} from 'react-router';
import type {Route} from './+types/products._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';

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
      <h1 className="section-heading">Products</h1>
      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
