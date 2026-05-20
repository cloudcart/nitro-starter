import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.wishlist';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import type {Product} from '@cloudcart/nitrogen';
import {HeartIcon} from '@heroicons/react/24/outline';
import {ProductCard} from '~/components/ProductCard';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Wishlist | Nitrogen'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  const wishlist = await ctx.customerAccount.getWishlist(50);
  return {wishlist};
}

export default function Wishlist() {
  const {wishlist} = useLoaderData<typeof loader>();
  const items = wishlist.nodes;

  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4">Wishlist</h2>
        <div className="py-16 text-center">
          <HeartIcon className="size-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 mb-1 font-medium">Your wishlist is empty</p>
          <p className="text-sm text-gray-400 mb-4">Save products you love to find them quickly later.</p>
          <Link to="/collections" className="inline-flex items-center gap-1 text-sm text-brand font-medium hover:underline">
            Browse products →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Wishlist</h2>
        <span className="text-sm text-gray-400">
          {wishlist.totalCount} {wishlist.totalCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {items.map((item) => (
          <ProductCard key={item.id} product={item.product as unknown as Product} />
        ))}
      </div>
    </section>
  );
}
