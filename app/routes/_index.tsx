import {useLoaderData, Link, Await} from 'react-router';
import {Suspense} from 'react';
import type {Route} from './+types/_index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import type {Collection, Product} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import {ProductCard} from '~/components/ProductCard';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitrogen | Home', description: 'Modern headless commerce'});

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
        <h2 className="text-2xl font-bold tracking-tight mb-5">Recommended Products</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <Await resolve={recommendedProducts}>
            {(products) => (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
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
    <Link to={`/collections/${collection.handle}`} className="relative block rounded-xl overflow-hidden mb-12 hover:no-underline" prefetch="intent">
      {collection.image?.url ? (
        <Image data={collection.image} alt={collection.title} loading="eager" className="w-full aspect-[16/7] object-cover rounded-xl" />
      ) : (
        <div className="aspect-[16/7] bg-gradient-to-br from-brand to-pink-500 rounded-xl" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8 rounded-xl">
        <h1 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight">{collection.title}</h1>
      </div>
    </Link>
  );
}
