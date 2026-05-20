import type {ReactNode} from 'react';
import type {Shop, Menu, CartData} from '@cloudcart/nitrogen';
import {Header} from './Header';
import {Footer} from './Footer';

interface PageLayoutProps {
  shop: Shop;
  headerMenu: Menu | null;
  footerMenu: Menu | null;
  cart: Promise<CartData | null>;
  children: ReactNode;
}

export function PageLayout({shop, headerMenu, footerMenu, cart, children}: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header shop={shop} menu={headerMenu} cart={cart} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-10">{children}</main>
      <Footer shop={shop} menu={footerMenu} />
    </div>
  );
}
