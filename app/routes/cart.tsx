import {useLoaderData, redirect} from 'react-router';
import type {Route} from './+types/cart';
import {getContext} from '~/lib/context';
import type {CartData} from '@cloudcart/nitro';
import {Money, Image, CartForm, useOptimisticCart} from '@cloudcart/nitro-react';

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
  switch (act) {
    case 'ADD_TO_CART': cart = await ctx.cart.addLines([{merchandiseId: String(fd.get('merchandiseId')), quantity: Number(fd.get('quantity') || 1)}]); break;
    case 'UPDATE_CART': cart = await ctx.cart.updateLines([{id: String(fd.get('lineId')), quantity: Number(fd.get('quantity'))}]); break;
    case 'REMOVE_FROM_CART': cart = await ctx.cart.removeLines([String(fd.get('lineId'))]); break;
    default: cart = await ctx.cart.get();
  }
  if (fd.get('redirectTo')) return redirect(String(fd.get('redirectTo')), 303);
  return {cart};
}

export default function CartPage() {
  const {cart: loaderCart} = useLoaderData<typeof loader>();
  const cart = useOptimisticCart(loaderCart);
  if (cart.totalQuantity === 0) return <div><h1>Cart</h1><p>Your cart is empty.</p></div>;
  return (
    <div>
      <h1>Cart</h1>
      <ul style={{listStyle:'none',padding:0}}>
        {cart.lines.nodes.map((line) => (
          <li key={line.id} style={{display:'flex',gap:'1rem',padding:'1rem 0',borderBottom:'1px solid #eee',alignItems:'center'}}>
            <Image data={line.merchandise.image} alt={line.merchandise.title} width={80} height={80} />
            <div style={{flex:1}}>
              <strong>{line.merchandise.product.title}</strong>
              <div><Money data={line.cost.totalAmount} /></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
              <CartForm action="UPDATE_CART" inputs={{lineId: line.id, quantity: Math.max(0, line.quantity - 1)}}><button type="submit">-</button></CartForm>
              <span>{line.quantity}</span>
              <CartForm action="UPDATE_CART" inputs={{lineId: line.id, quantity: line.quantity + 1}}><button type="submit">+</button></CartForm>
              <CartForm action="REMOVE_FROM_CART" inputs={{lineId: line.id}}><button type="submit">x</button></CartForm>
            </div>
          </li>
        ))}
      </ul>
      <div style={{textAlign:'right',padding:'1rem 0',fontSize:'1.25rem'}}><strong>Total: <Money data={cart.cost.totalAmount} /></strong></div>
    </div>
  );
}
