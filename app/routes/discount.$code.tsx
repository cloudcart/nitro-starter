import {redirect} from 'react-router';
import type {Route} from './+types/discount.$code';
import {getContext} from '~/lib/context';

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  if (params.code) await ctx.cart.updateDiscountCodes([params.code]);
  return redirect('/cart');
}
