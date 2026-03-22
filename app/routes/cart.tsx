import {useLoaderData, redirect, Link, data as routeData} from 'react-router';
import type {Route} from './+types/cart';
import {getContext} from '~/lib/context';
import type {CartData} from '@cloudcart/nitro';
import {Money, Image, useOptimisticCart} from '@cloudcart/nitro-react';

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

  try {
    switch (act) {
      case 'ADD_TO_CART':
        cart = await ctx.cart.addLines([{merchandiseId: String(fd.get('merchandiseId')), quantity: Number(fd.get('quantity') || 1)}]);
        break;
      case 'UPDATE_CART':
        cart = await ctx.cart.updateLines([{id: String(fd.get('lineId')), quantity: Number(fd.get('quantity'))}]);
        break;
      case 'REMOVE_FROM_CART':
        cart = await ctx.cart.removeLines([String(fd.get('lineId'))]);
        break;
      default:
        cart = await ctx.cart.get();
    }
  } catch (error) {
    console.error('Cart action error:', error);
    cart = await ctx.cart.get();
  }

  // Commit session cookie if it changed (e.g., new cart ID stored)
  const headers = new Headers();
  if (ctx.session.isPending) {
    headers.set('Set-Cookie', await ctx.session.commit());
  }

  if (fd.get('redirectTo')) {
    return redirect(String(fd.get('redirectTo')), {status: 303, headers});
  }

  return routeData({cart}, {headers});
}

export default function CartPage() {
  const {cart: loaderCart} = useLoaderData<typeof loader>();
  const cart = useOptimisticCart(loaderCart);

  if (cart.totalQuantity === 0) {
    return (
      <div className="cart-page">
        <h1 className="section-heading">Cart</h1>
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
      <ul className="cart-lines">
        {cart.lines.nodes.map((line) => (
          <li key={line.id} className="cart-line">
            <Image data={line.merchandise.image} alt={line.merchandise.title} width={80} height={80} />
            <div className="cart-line-details">
              <strong>{line.merchandise.product.title}</strong>
              <div className="variant">{line.merchandise.title}</div>
              <div><Money data={line.cost.totalAmount} /></div>
            </div>
            <div className="cart-line-quantity">
              <CartForm action="UPDATE_CART" inputs={{lineId: line.id, quantity: Math.max(0, line.quantity - 1)}}>
                <button type="submit">-</button>
              </CartForm>
              <span>{line.quantity}</span>
              <CartForm action="UPDATE_CART" inputs={{lineId: line.id, quantity: line.quantity + 1}}>
                <button type="submit">+</button>
              </CartForm>
              <CartForm action="REMOVE_FROM_CART" inputs={{lineId: line.id}}>
                <button type="submit">&times;</button>
              </CartForm>
            </div>
          </li>
        ))}
      </ul>
      <div className="cart-summary">
        <span className="total">Total: <Money data={cart.cost.totalAmount} /></span>
        <button className="cart-checkout-btn">Checkout</button>
      </div>
    </div>
  );
}
