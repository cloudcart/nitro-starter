import {data, redirect} from 'react-router';
import type {Route} from './+types/api.wishlist';
import {getContext} from '~/lib/context';

export async function loader() {
  return redirect('/');
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);

  if (!ctx.customerAccount.isLoggedIn()) {
    return data({error: 'Not authenticated.', loggedIn: false}, {status: 401});
  }

  const form = await request.formData();
  const productId = form.get('productId')?.toString() ?? '';
  if (!productId) return data({error: 'Missing product id.'}, {status: 400});

  if (request.method === 'POST') {
    const {errors} = await ctx.customerAccount.addToWishlist(productId);
    if (errors.length) return data({error: errors[0].message}, {status: 400});
    return {inWishlist: true};
  }

  if (request.method === 'DELETE') {
    const {errors} = await ctx.customerAccount.removeFromWishlist(productId);
    if (errors.length) return data({error: errors[0].message}, {status: 400});
    return {inWishlist: false};
  }

  return data({error: 'Method not allowed.'}, {status: 405});
}
