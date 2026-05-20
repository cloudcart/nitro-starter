import {NavLink, Link, Await} from 'react-router';
import {Suspense} from 'react';
import type {Shop, Menu, CartData} from '@cloudcart/nitrogen';
import {useAside} from './Aside';
import {MagnifyingGlassIcon, ShoppingBagIcon, UserIcon} from '@heroicons/react/24/outline';

interface HeaderProps {
  shop: Shop;
  menu: Menu | null;
  cart: Promise<CartData | null>;
}

const FALLBACK_MENU = [
  {title: 'Categories', url: '/collections'},
  {title: 'Products', url: '/products'},
  {title: 'Blog', url: '/blogs'},
];

export function Header({shop, menu, cart}: HeaderProps) {
  const items = menu?.items ?? FALLBACK_MENU;
  const {open} = useAside();

  return (
    <header className="flex items-center bg-light border-b border-gray-200 h-16 px-6 md:px-8 sticky top-0 z-10">
      <Link to="/" className="text-xl font-extrabold tracking-tight text-dark hover:no-underline">{shop.name}</Link>

      <nav className="hidden md:flex gap-6 ml-10">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={({isActive}) =>
              `text-sm font-medium transition-colors duration-150 hover:text-dark hover:no-underline ${isActive ? 'text-dark font-semibold' : 'text-gray-600'}`
            }
            prefetch="intent"
          >
            {item.title}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 ml-auto">
        <NavLink to="/search" className="text-gray-500 hover:text-dark transition-colors duration-150 p-1" aria-label="Search">
          <MagnifyingGlassIcon className="size-5" />
        </NavLink>
        <NavLink to="/account" className="text-gray-500 hover:text-dark transition-colors duration-150 p-1" aria-label="Account">
          <UserIcon className="size-5" />
        </NavLink>
        <button
          className="text-gray-500 hover:text-dark transition-colors duration-150 p-1 relative"
          onClick={() => open('cart')}
          aria-label="Open cart"
        >
          <ShoppingBagIcon className="size-5" />
          <Suspense>
            <Await resolve={cart}>
              {(resolvedCart) =>
                resolvedCart && resolvedCart.totalQuantity > 0 ? (
                  <span className="absolute -top-1 -right-1.5 bg-brand text-white rounded-full size-[18px] text-[0.6rem] font-bold flex items-center justify-center">{resolvedCart.totalQuantity}</span>
                ) : null
              }
            </Await>
          </Suspense>
        </button>
      </div>
    </header>
  );
}
