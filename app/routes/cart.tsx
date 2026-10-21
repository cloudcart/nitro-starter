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
import {CartRecommendations} from '~/components/CartRecommendations';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT} from '~/components/ReviewDisplay';
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

/**
 * The cart — the same call as the root's, which the storefront client shares — and, deferred, products like its
 * first one. The store's cross-sell is read once by the page itself (`/cart/offer`).
 */
export async function loader({context}: Route.LoaderArgs) {
  const {cart, storefront, customerAccount} = context;
  const current = await cart.get();
  const productId = current?.lines.nodes[0]?.merchandise.product.id;

  const recommendations = productId
    ? storefront
        .query(CART_RECOMMENDATIONS_QUERY, {
          variables: {productId, first: RECOMMENDED, buyer: await customerAccount.getBuyer()},
          // Product cards: catalogue data (B-408).
          cache: storefront.CacheShort(),
        })
        .then(({product, productReviewSettings}) => ({
          products: product?.relatedProducts.nodes ?? [],
          // The merchant's rating settings, for the cards (`ReviewDisplayProvider`).
          reviewDisplay: productReviewSettings,
        }))
        .catch((error: unknown) => {
          console.error(error);
          return NO_RECOMMENDATIONS;
        })
    : Promise.resolve(NO_RECOMMENDATIONS);

  return {cart: current, recommendations};
}

/** How many products "You may also like" shows. */
const RECOMMENDED = 4;
const NO_RECOMMENDATIONS = {products: [], reviewDisplay: null};

export default function Cart() {
  const {t} = useTranslation();
  const {cart, recommendations} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-10 md:px-gutter-md">
      <h1 className="mb-8 text-title">{t('cart.title')}</h1>
      <CartMain layout="page" cart={cart} />
      <CartCrossSell hasLines={Boolean(cart?.totalQuantity)} />
      <CartRecommendations recommendations={recommendations} placeholders={cart?.totalQuantity ? RECOMMENDED : 0} />
      <Analytics.CartView />
    </div>
  );
}

const CART_RECOMMENDATIONS_QUERY = `#graphql
  query CartRecommendations($productId: ID!, $first: Int!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    # As the product page's "You may also like": the product's category, without its linked products (B-421).
    product(id: $productId) {
      relatedProducts(first: $first, linked: false) {
        nodes {
          ...ProductItem
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
