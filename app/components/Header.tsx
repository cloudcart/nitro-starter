import {Suspense, useRef} from 'react';
import {Await, Link, useAsyncValue} from 'react-router';
import {
  analyticsPageUrl,
  type CartViewPayload,
  type Translate,
  useAnalytics,
  useOptimisticCart,
  useTranslation,
} from '@cloudcart/nitrogen';
import {Image, KeptNavLink} from '@cloudcart/nitrogen-react';
import type {CartApiQueryFragment, HeaderQuery} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {MegaMenu} from '~/components/MegaMenu';
import {type ParentMenuItem} from '~/components/MenuLink';
import {MobileMenu} from '~/components/MobileMenu';
import {useHeaderHiding} from '~/lib/header-hiding';
import {SEARCH_ENDPOINT} from '~/lib/search';
import {storefrontLink} from '~/lib/urls';
import {AccountIcon, CartIcon, MenuIcon, SearchIcon} from '~/components/ui/icons';
import {CountBadge} from '~/components/ui/Badge';
import type {Streamed} from '~/lib/visitor';

interface HeaderProps {
  header: HeaderQuery;
  cart: Streamed<CartApiQueryFragment | null>;
  isLoggedIn: Streamed<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

/**
 * The sticky header, inside the page's width: the menu button (below 990 px, where the mega menu is not shown),
 * the logo and the main menu on the left; the search, account and cart icons on the right. Below 990 px it slides
 * away while the visitor scrolls down and comes back when they scroll up (`useHeaderHiding`), leaving the top to a
 * listing's filters and sort.
 */
export function Header({header, isLoggedIn, cart, publicStoreDomain}: HeaderProps) {
  const {shop, menu} = header;
  const logo = shop.brand.logo?.image;
  const headerRef = useRef<HTMLElement>(null);
  useHeaderHiding(headerRef);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border bg-background transition-transform duration-300 ease-out max-lg:header-hidden:-translate-y-full"
    >
      <div className="mx-auto flex h-16 max-w-page items-center gap-6 px-gutter md:px-gutter-md">
        <HeaderMenuMobileToggle />
        <KeptNavLink to="/" end className="shrink-0 text-h4 hover:no-underline">
          {logo ? (
            // 36 px high, as wide as its proportions make it, served by the image CDN at that height (B-199).
            <Image data={logo} alt={shop.name} width="auto" height={36} loading="eager" className="h-9 w-auto" />
          ) : (
            shop.name
          )}
        </KeptNavLink>
        <HeaderMenu
          menu={menu}
          viewport="desktop"
          primaryDomainUrl={shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        <HeaderActions isLoggedIn={isLoggedIn} cart={cart} />
      </div>
    </header>
  );
}

/** The main menu: the mega menu on a desktop, the accordion list in the menu drawer on a phone. */
export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const {t} = useTranslation();
  const {close} = useAside();
  const items: ParentMenuItem[] = menu?.items.length ? menu.items : fallbackMenu(t);
  const toPath = (url: string) => storefrontLink(url, {primaryDomainUrl, publicStoreDomain});

  if (viewport === 'mobile') return <MobileMenu items={items} toPath={toPath} onNavigate={close} />;
  return <MegaMenu items={items} toPath={toPath} />;
}

const ICON_LINK = 'relative grid size-11 place-items-center rounded-button hover:no-underline';

function HeaderActions({isLoggedIn, cart}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  const {t} = useTranslation();

  return (
    <div className="ml-auto flex items-center">
      <SearchToggle />
      <KeptNavLink to="/account" className={ICON_LINK}>
        <AccountIcon />
        <span className="sr-only">
          <Suspense fallback={t('header.signIn')}>
            <Await resolve={isLoggedIn} errorElement={t('header.signIn')}>
              {(isLoggedIn) => (isLoggedIn ? t('header.account') : t('header.signIn'))}
            </Await>
          </Suspense>
        </span>
      </KeptNavLink>
      <CartToggle cart={cart} />
    </div>
  );
}

function HeaderMenuMobileToggle() {
  const {t} = useTranslation();
  const {open} = useAside();

  return (
    <button
      type="button"
      aria-label={t('header.openMenu')}
      className="-ml-3 grid size-11 place-items-center rounded-button lg:hidden"
      onClick={() => open('mobile')}
    >
      <MenuIcon />
    </button>
  );
}

/** A link to the search page, which opens the search panel instead once the page has loaded. */
function SearchToggle() {
  const {t} = useTranslation();
  const {open} = useAside();

  return (
    <Link
      to={SEARCH_ENDPOINT}
      aria-label={t('header.search')}
      className={ICON_LINK}
      onClick={(event) => {
        event.preventDefault();
        open('search');
      }}
    >
      <SearchIcon />
    </Link>
  );
}

/** A link to the cart page, which opens the cart drawer instead once the page has loaded. */
function CartBadge({count}: {count: number}) {
  const {t} = useTranslation();
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <Link
      to="/cart"
      aria-label={t('header.cart', {count})}
      className={`${ICON_LINK} -mr-3`}
      onClick={(event) => {
        event.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          // The page's address as analytics reports it: a private page's masked (B-390).
          url: analyticsPageUrl(),
        } as CartViewPayload);
      }}
    >
      <CartIcon />
      {count > 0 && <CountBadge className="absolute top-1 right-0.5">{count}</CountBadge>}
    </Link>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

// Shown until the merchant fills in the main menu in the CloudCart admin.
function fallbackMenu(t: Translate): ParentMenuItem[] {
  const route = (id: string, title: string, url: string): ParentMenuItem => ({
    id,
    resourceId: null,
    title,
    url,
    openInNewTab: false,
    items: [],
  });
  return [
    route('categories', t('menu.categories'), '/categories'),
    route('vendors', t('menu.brands'), '/vendors'),
    route('blog', t('menu.blog'), '/blog'),
  ];
}
