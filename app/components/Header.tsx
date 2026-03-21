import {NavLink, Link} from 'react-router';
import type {Shop, Menu} from '@cloudcart/nitro';

interface HeaderProps {
  shop: Shop;
  menu: Menu | null;
}

const FALLBACK_MENU = [
  {title: 'Collections', url: '/collections'},
  {title: 'Products', url: '/products'},
  {title: 'Blog', url: '/blogs'},
];

export function Header({shop, menu}: HeaderProps) {
  const items = menu?.items ?? FALLBACK_MENU;

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
        <NavLink to="/cart" className="cart-badge">Cart</NavLink>
      </div>
    </header>
  );
}
