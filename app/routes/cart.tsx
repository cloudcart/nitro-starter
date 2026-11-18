import {data, type HeadersFunction, useLoaderData} from 'react-router';
import {
  Analytics,
  CartForm,
  cartClientAction,
  type CartQueryDataReturn,
  localRedirectPath,
  useTranslation,
} from '@cloudcart/nitrogen';
import type {Route} from './+types/cart';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import {CartCrossSell} from '~/components/CartCrossSell';
import {CartMain} from '~/components/CartMain';
import {PersonalRecommendations} from '~/components/PersonalRecommendations';
import {RouteErrorBoundary} from '~/components/RouteError';

/**
 * The cart the action answers with is the one the page shows next, with no request for it (`useLatestCart`): noted
 * before the router has the answer.
 */
export const clientAction = ({serverAction}: Route.ClientActionArgs) => cartClientAction(serverAction);

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('cart.title'));

/**
 * After a change, with the action's headers (its cookie). The buyer's own cart is kept from every cache by Nitrogen's
 * request handler: the page reads it (B-449, T-599).
 */
export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

/** Every cart change in the app — `CartForm`s anywhere — is handled here. */
export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;

  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  // A post without a known cart action is the client's mistake: refused, without echoing what it sent.
  if (!action) {
    throw new Response('No cart action', {status: 400});
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd: {
      // The product page asks for the store's up-sell first (`upSell: 'check'`): when the store has one, nothing is
      // added and the buyer chooses between the offer and the variant they picked.
      const added = await cart.addLines(inputs.lines, {upSell: inputs.upSell});
      if ('upSellOffer' in added) return data(added);
      result = added;
      break;
    }
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // The code the buyer typed…
      const discountCodes = (formDiscountCode ? [formDiscountCode] : []) as string[];

      // …and the codes already on the cart.
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate:
      result = await cart.updateBuyerIdentity({...inputs.buyerIdentity});
      break;
    case CartForm.ACTIONS.BundleAdd:
      result = await cart.addBundle(inputs.bundle);
      break;
    default:
      throw new Response('Unknown cart action', {status: 400});
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  // The refusals, the warnings (an input the store ignored, a code it dropped) and the cross-sell the store picked
  // after an add or a quantity change.
  const {cart: cartResult, errors, userErrors, warnings, crossSellOffer} = result;

  // A form may ask to go on to another page of the storefront; only a path on it is followed.
  const redirectTo = localRedirectPath(formData.get('redirectTo'));
  if (redirectTo) {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      userErrors,
      warnings,
      crossSellOffer: crossSellOffer ?? null,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

/** The cart — the same call as the root's, which the storefront client shares. The cross-sell is read once by the page itself (`/cart/offer`). */
export async function loader({context}: Route.LoaderArgs) {
  const {cart, customerAccount} = context;
  // Whether someone is signed in, from the session: CloudCart Pay's buttons may need it (T-622).
  return {cart: await cart.get(), isLoggedIn: await customerAccount.isLoggedIn()};
}

/** How many products "You may also like" shows: the `CART` list the browser asks for (T-667). */
const RECOMMENDED = 4;

export default function Cart() {
  const {t} = useTranslation();
  const {cart, isLoggedIn} = useLoaderData<typeof loader>();
  const cartProductIds = [...new Set(cart?.lines.nodes.map((line) => line.merchandise.product.id) ?? [])];

  return (
    <div className="mx-auto max-w-page px-gutter py-10 md:px-gutter-md">
      <h1 className="mb-8 text-title">{t('cart.title')}</h1>
      <CartMain layout="page" cart={cart} signedIn={isLoggedIn} />
      <CartCrossSell hasLines={Boolean(cart?.totalQuantity)} />
      {cartProductIds.length > 0 && (
        <PersonalRecommendations
          key={cartProductIds.join(',')}
          intent="CART"
          cartProductIds={cartProductIds}
          title={() => t('cart.alsoLike')}
          placeholders={RECOMMENDED}
          className="mt-16"
        />
      )}
      <Analytics.CartView />
    </div>
  );
}
