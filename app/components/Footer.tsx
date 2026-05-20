import {NavLink} from 'react-router';
import type {Shop, Menu} from '@cloudcart/nitrogen';

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
    <footer className="bg-gray-900 text-gray-400 mt-auto py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 items-center md:flex-row md:justify-between">
        <nav className="flex flex-wrap gap-6 justify-center">
          {items.map((item) => (
            <NavLink key={item.title} to={item.url} prefetch="intent" className="text-gray-400 text-sm transition-colors duration-150 hover:text-light hover:no-underline">
              {item.title}
            </NavLink>
          ))}
        </nav>
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {shop.name}. Powered by Nitrogen.
        </p>
      </div>
    </footer>
  );
}
