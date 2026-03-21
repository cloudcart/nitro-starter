import {NavLink, Link, Await} from 'react-router';
import {Suspense} from 'react';
import type {Shop, Menu, CartData} from '@cloudcart/nitro';
import {useAside} from './Aside';

interface HeaderProps {
  shop: Shop;
  menu: Menu | null;
  cart: Promise<CartData | null>;
}

const FALLBACK_MENU = [
  {title: 'Collections', url: '/collections'},
  {title: 'Products', url: '/products'},
  {title: 'Blog', url: '/blogs'},
];

export function Header({shop, menu, cart}: HeaderProps) {
  const items = menu?.items ?? FALLBACK_MENU;
  const {open} = useAside();

  return (
    <header className="header">
      <Link to="/" className="header-logo">{shop.name}</Link>

      <nav className="header-menu-desktop">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={({isActive}) => isActive ? 'active' : ''}
            prefetch="intent"
          >
            {item.title}
          </NavLink>
        ))}
      </nav>

      <div className="header-ctas">
        <NavLink to="/search">Search</NavLink>
        <button className="cart-toggle" onClick={() => open('cart')}>
          Cart
          <Suspense>
            <Await resolve={cart}>
              {(resolvedCart) =>
                resolvedCart && resolvedCart.totalQuantity > 0 ? (
                  <span className="cart-count">{resolvedCart.totalQuantity}</span>
                ) : null
              }
            </Await>
          </Suspense>
        </button>
      </div>
    </header>
  );
}
