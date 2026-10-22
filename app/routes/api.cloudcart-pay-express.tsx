import {handleCloudCartPayExpressRequest} from '@cloudcart/nitrogen';
import type {Route} from './+types/api.cloudcart-pay-express';

/**
 * Where CloudCart Pay's Apple Pay and Google Pay buttons (`WalletButtons`) post: the store prices the wallet sheet and
 * places the order from this server, for the signed-in customer or a guest (T-619). In the cart they pay for the
 * visitor's own cart, its id read from the session (T-622).
 */
export async function action({request, context}: Route.ActionArgs) {
  return handleCloudCartPayExpressRequest({
    request,
    storefront: context.storefront,
    customerAccount: context.customerAccount,
    cart: context.cart,
  });
}
