import {useLoaderData, Link, Await} from 'react-router';
import {Suspense} from 'react';
import type {Route} from './+types/_index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import type {Collection, Product} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {ProductCard} from '~/components/ProductCard';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitro | Home', description: 'Modern headless commerce'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const collections = await ctx.storefront.getCollections(1);
  const featuredCollection = collections[0] ?? null;

  const recommendedProducts = ctx.storefront
    .getProducts(4)
    .catch((error: Error) => {
      console.error(error);
      return [];
    });

  return {featuredCollection, recommendedProducts};
}

export default function Homepage() {
  const {featuredCollection, recommendedProducts} = useLoaderData<typeof loader>();

  return (
    <div>
      <FeaturedCollection collection={featuredCollection} />
      <section>
        <h2 className="section-heading">Recommended Products</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <Await resolve={recommendedProducts}>
            {(products) => (
              <div className="products-grid">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} loading={i < 2 ? 'eager' : 'lazy'} />
                ))}
              </div>
            )}
          </Await>
        </Suspense>
      </section>
    </div>
  );
}

function FeaturedCollection({collection}: {collection: Collection | null}) {
  if (!collection) return null;

  return (
    <Link to={`/collections/${collection.handle}`} className="hero" prefetch="intent">
      {collection.image?.url ? (
        <Image data={collection.image} alt={collection.title} loading="eager" />
      ) : (
        <div style={{aspectRatio: '16/7', background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: 12}} />
      )}
      <div className="hero-overlay">
        <h1>{collection.title}</h1>
      </div>
    </Link>
  );
}
