import {useLoaderData, Form} from 'react-router';
import type {Route} from './+types/search';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {PaginatedResourceSection} from '@cloudcart/nitro-react';
import {ProductCard} from '~/components/ProductCard';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Search | Nitro'});

export async function loader({request, context}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';

  if (!q) return {query: q, results: null};

  const paginationVariables = getPaginationVariables(request, {pageBy: 8});
  const results = await ctx.storefront.searchProductsPaginated(q, paginationVariables);
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

      {query && !results && (
        <p className="search-empty">Enter a search term to find products.</p>
      )}

      {query && results && (
        <>
          <p className="search-results-count">
            {results.nodes.length > 0
              ? `Results for "${query}"`
              : `No results found for "${query}"`}
          </p>
          {results.nodes.length > 0 && (
            <PaginatedResourceSection connection={results} resourcesClassName="products-grid">
              {(product) => <ProductCard key={product.id} product={product} />}
            </PaginatedResourceSection>
          )}
        </>
      )}
    </div>
  );
}
