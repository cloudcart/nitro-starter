import {Await, Link, useFetcher} from 'react-router';
import {Suspense} from 'react';
import type {CartData, CartLine} from '@cloudcart/nitro';
import {Money, Image} from '@cloudcart/nitro-react';
import {useAside} from './Aside';

export function CartDrawer({cart}: {cart: Promise<CartData | null>}) {
  return (
    <Suspense fallback={<p style={{padding: '1.25rem'}}>Loading cart...</p>}>
      <Await resolve={cart}>
        {(resolvedCart) => <CartDrawerInner cart={resolvedCart} />}
      </Await>
    </Suspense>
  );
}

function CartDrawerInner({cart}: {cart: CartData | null}) {
  const {close} = useAside();

  if (!cart || cart.totalQuantity === 0) {
    return (
      <div className="cart-drawer-empty">
        <p>Your cart is empty</p>
        <button onClick={close} className="cart-drawer-continue">Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="cart-drawer">
      <ul className="cart-drawer-lines">
        {cart.lines.nodes.map((line) => (
          <CartDrawerLine key={line.id} line={line} />
        ))}
      </ul>

      <div className="cart-drawer-footer">
        <div className="cart-drawer-totals">
          <span>Subtotal</span>
          <strong><Money data={cart.cost.totalAmount} /></strong>
        </div>
        <Link to="/cart" className="cart-drawer-checkout" onClick={close}>
          Continue to Checkout &rarr;
        </Link>
      </div>
    </div>
  );
}

function CartDrawerLine({line}: {line: CartLine}) {
  const updateFetcher = useFetcher({key: `update-${line.id}`});
  const removeFetcher = useFetcher({key: `remove-${line.id}`});

  // Hide line if remove is pending
  if (removeFetcher.state !== 'idle') return null;

  // Optimistic quantity from pending update
  const pendingQty = updateFetcher.formData
    ? Number(updateFetcher.formData.get('quantity'))
    : null;
  const quantity = pendingQty ?? line.quantity;

  if (quantity <= 0) return null;

  return (
    <li className="cart-drawer-line">
      {(line.merchandise.image ?? line.merchandise.product.featuredImage) && (
        <Image data={line.merchandise.image ?? line.merchandise.product.featuredImage} alt={line.merchandise.product.title} width={64} height={64} />
      )}
      <div className="cart-drawer-line-details">
        <strong>{line.merchandise.product.title}</strong>
        {line.merchandise.selectedOptions.length > 0 && (
          <div className="cart-drawer-variant">
            {line.merchandise.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(', ')}
          </div>
        )}
        <div className="cart-drawer-price"><Money data={line.cost.totalAmount} /></div>
      </div>
      <div className="cart-drawer-line-actions">
        <div className="cart-drawer-qty">
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
        </div>
        <removeFetcher.Form method="post" action="/cart">
          <input type="hidden" name="action" value="REMOVE_FROM_CART" />
          <input type="hidden" name="lineId" value={line.id} />
          <button type="submit" className="cart-drawer-remove">Remove</button>
        </removeFetcher.Form>
      </div>
    </li>
  );
}
