import {NavLink} from 'react-router';
import type {Shop, Menu} from '@cloudcart/nitro';

interface FooterProps {
  shop: Shop;
  menu: Menu | null;
}

const FALLBACK_MENU = [
  {title: 'Privacy Policy', url: '/policies/privacy-policy'},
  {title: 'Terms of Service', url: '/policies/terms-of-service'},
  {title: 'Contact', url: '/pages/contact'},
];

export function Footer({shop, menu}: FooterProps) {
  const items = menu?.items ?? FALLBACK_MENU;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <nav className="footer-menu">
          {items.map((item) => (
            <NavLink key={item.title} to={item.url} prefetch="intent">
              {item.title}
            </NavLink>
          ))}
        </nav>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} {shop.name}. Powered by Nitro.
        </p>
      </div>
    </footer>
  );
}
