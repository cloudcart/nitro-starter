import {useLoaderData, Form} from 'react-router';
import type {Route} from './+types/search';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitro | Search'});

export async function loader({request, context}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const results = q ? await ctx.storefront.searchProducts(q) : [];
  return {query: q, results};
}

export default function SearchPage() {
  const {query, results} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1 className="section-heading">Search</h1>
      <Form method="get" className="search-form">
        <input type="search" name="q" defaultValue={query} placeholder="Search products..." />
        <button type="submit">Search</button>
      </Form>

      {query && (
        <p style={{color: 'var(--color-gray-500)', marginBottom: '1.5rem'}}>
          {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
        </p>
      )}

      <div className="products-grid">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
