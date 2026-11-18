import {CUSTOMER_SIGNALS_QUERY, customerSignalsFrom, type CustomerSignalsAnswer} from '@cloudcart/nitrogen';
import type {Route} from './+types/recommendation-signals';

const PRIVATE = {'Cache-Control': 'private, no-store'};

/**
 * /recommendation-signals — a signed-in customer's products for their recommendations (T-667): their orders' products,
 * wishlist and subscriptions, with each product's categories and brand. The browser asks once a session
 * (`useCustomerSignals`) and keeps the answer for the session; null when no one is signed in.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!(await customerAccount.isLoggedIn())) return Response.json(null, {headers: PRIVATE});

  const answer = await customerAccount.query(CUSTOMER_SIGNALS_QUERY).catch((error: unknown) => {
    // A token the API refused ends the session (a redirect): no signals then.
    if (!(error instanceof Response)) console.error(error);
    return null;
  });
  return Response.json(customerSignalsFrom(answer as CustomerSignalsAnswer | null), {headers: PRIVATE});
}
