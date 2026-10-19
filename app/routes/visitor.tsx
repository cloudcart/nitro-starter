import type {Route} from './+types/visitor';
import type {VisitorData} from '~/lib/visitor';
import {loadVisitorData} from '~/lib/visitor.server';

/**
 * /visitor — the visitor's own data for a page cached for every visitor (`isSharedPage`): their cart, whether they
 * are signed in, the subscribe forms that ask them. Asked by the page's head script (`<VisitorDataScript>`) and
 * again after a form is sent; never cached.
 */
export async function loader(args: Route.LoaderArgs) {
  const {cart, isLoggedIn, subscribeForms} = loadVisitorData(args);
  const [cartData, signedIn, forms] = await Promise.all([cart, isLoggedIn, subscribeForms]);
  const visitor: VisitorData = {cart: cartData, isLoggedIn: signedIn, subscribeForms: forms};
  return Response.json(visitor, {headers: {'Cache-Control': 'private, no-store'}});
}
