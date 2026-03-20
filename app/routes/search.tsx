import {useLoaderData, Form, Link} from 'react-router';
import type {Route} from './+types/search';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Money, Image} from '@cloudcart/nitro-react';

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
      <h1>Search</h1>
      <Form method="get" style={{display:'flex',gap:'0.5rem',marginBottom:'2rem'}}>
        <input type="search" name="q" defaultValue={query} placeholder="Search products..." style={{flex:1,padding:'0.75rem',border:'1px solid #ccc',borderRadius:4}} />
        <button type="submit" style={{padding:'0.75rem 1.5rem'}}>Search</button>
      </Form>
      {query && <p>{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'1.5rem'}}>
        {results.map((p) => (
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
