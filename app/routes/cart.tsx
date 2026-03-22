import {useLoaderData, redirect, Link, useFetcher, useFetchers, data as routeData} from 'react-router';
import type {Route} from './+types/cart';
import {getContext} from '~/lib/context';
import type {CartData, CartLine} from '@cloudcart/nitro';
import {Money, Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = () => [{title: 'Nitro | Cart'}];

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const cart = await ctx.cart.get();
  return {cart};
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  const fd = await request.formData();
  const act = String(fd.get('action'));
  let cart: CartData;
  let errors: Array<{message: string}> = [];

  try {
    switch (act) {
      case 'ADD_TO_CART': {
        const result = await ctx.cart.addLines([{merchandiseId: String(fd.get('merchandiseId')), quantity: Number(fd.get('quantity') || 1)}]);
        cart = result.cart;
        errors = result.userErrors;
        break;
      }
      case 'UPDATE_CART': {
        const result = await ctx.cart.updateLines([{id: String(fd.get('lineId')), quantity: Number(fd.get('quantity'))}]);
        cart = result.cart;
        errors = result.userErrors;
        break;
      }
      case 'REMOVE_FROM_CART': {
        const result = await ctx.cart.removeLines([String(fd.get('lineId'))]);
        cart = result.cart;
        errors = result.userErrors;
        break;
      }
      default:
        cart = await ctx.cart.get();
    }
  } catch (error) {
    console.error('Cart action error:', error);
    cart = await ctx.cart.get();
    errors = [{message: error instanceof Error ? error.message : 'An error occurred'}];
  }

  const headers = new Headers();
  if (ctx.session.isPending) {
    headers.set('Set-Cookie', await ctx.session.commit());
  }

  if (fd.get('redirectTo')) {
    return redirect(String(fd.get('redirectTo')), {status: 303, headers});
  }

  return routeData({cart, errors}, {headers});
}

export default function CartPage() {
  const {cart} = useLoaderData<typeof loader>();

  // Show errors from any cart fetcher
  const fetchers = useFetchers();
  const cartErrors = fetchers
    .filter((f) => f.formAction === '/cart' && f.data?.errors?.length)
    .flatMap((f) => f.data.errors as Array<{message: string}>);

  if (!cart || cart.totalQuantity === 0) {
    return (
      <div className="cart-page">
        <h1 className="section-heading">Cart</h1>
        {cartErrors.length > 0 && <CartErrors errors={cartErrors} />}
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <Link to="/products">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1 className="section-heading">Cart</h1>
      {cartErrors.length > 0 && <CartErrors errors={cartErrors} />}
      <ul className="cart-lines">
        {cart.lines.nodes.map((line) => (
          <CartLineItem key={line.id} line={line} />
        ))}
      </ul>
      <div className="cart-summary">
        <span className="total">Total: <Money data={cart.cost.totalAmount} /></span>
        <button className="cart-checkout-btn">Checkout</button>
      </div>
    </div>
  );
}

function CartErrors({errors}: {errors: Array<{message: string}>}) {
  return (
    <div className="cart-errors">
      {errors.map((error, i) => (
        <p key={i}>{error.message}</p>
      ))}
    </div>
  );
}

function CartLineItem({line}: {line: CartLine}) {
  const updateFetcher = useFetcher({key: `update-${line.id}`});
  const removeFetcher = useFetcher({key: `remove-${line.id}`});

  if (removeFetcher.state !== 'idle') return null;

  const pendingQty = updateFetcher.formData
    ? Number(updateFetcher.formData.get('quantity'))
    : null;
  const quantity = pendingQty ?? line.quantity;
  if (quantity <= 0) return null;

  // Show error for this specific line
  const lineError = updateFetcher.data?.errors?.[0]?.message;

  const image = line.merchandise.image ?? line.merchandise.product.featuredImage;

  return (
    <li className="cart-line">
      {image && <Image data={image} alt={line.merchandise.product.title} width={80} height={80} />}
      <div className="cart-line-details">
        <strong>{line.merchandise.product.title}</strong>
        {line.merchandise.selectedOptions.length > 0 && (
          <div className="variant">
            {line.merchandise.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(', ')}
          </div>
        )}
        <div><Money data={line.cost.totalAmount} /></div>
        {lineError && <div className="cart-line-error">{lineError}</div>}
      </div>
      <div className="cart-line-quantity">
        <updateFetcher.Form method="post" action="/cart">
          <input type="hidden" name="action" value="UPDATE_CART" />
          <input type="hidden" name="lineId" value={line.id} />
          <input type="hidden" name="quantity" value={Math.max(0, quantity - 1)} />
          <button type="submit">-</button>
        </updateFetcher.Form>
        <span>{quantity}</span>
        <updateFetcher.Form method="post" action="/cart">
          <input type="hidden" name="action" value="UPDATE_CART" />
          <input type="hidden" name="lineId" value={line.id} />
          <input type="hidden" name="quantity" value={quantity + 1} />
          <button type="submit">+</button>
        </updateFetcher.Form>
        <removeFetcher.Form method="post" action="/cart">
          <input type="hidden" name="action" value="REMOVE_FROM_CART" />
          <input type="hidden" name="lineId" value={line.id} />
          <button type="submit">&times;</button>
        </removeFetcher.Form>
      </div>
    </li>
  );
}
