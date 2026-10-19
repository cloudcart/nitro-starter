import {Suspense, useRef, useState} from 'react';
import {Await} from 'react-router';
import {type SubscribeFormData, useTranslation} from '@cloudcart/nitrogen';
import type {CartApiQueryFragment, FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {AnnouncementBar} from '~/components/AnnouncementBar';
import {Aside, useAside} from '~/components/Aside';
import {CartMain} from '~/components/CartMain';
import {Footer} from '~/components/Footer';
import {Dialog} from '~/components/Dialog';
import {Header, HeaderMenu} from '~/components/Header';
import {PredictiveSearch} from '~/components/PredictiveSearch';
import {NavigationProgress, PageTransition} from '~/components/PageTransition';
import type {Streamed} from '~/lib/visitor';

interface PageLayoutProps {
  cart: Streamed<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Streamed<boolean>;
  publicStoreDomain: string;
  hasCookieConsent: boolean;
  subscribeForms: Promise<SubscribeFormData[] | null> | SubscribeFormData[] | null;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
  hasCookieConsent,
  subscribeForms,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <NavigationProgress />
      <SkipLink />
      <CartAside cart={cart} />
      <SearchModal />
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      {header && <AnnouncementBar shopName={header.shop.name} />}
      {header && <Header header={header} cart={cart} isLoggedIn={isLoggedIn} publicStoreDomain={publicStoreDomain} />}
      <main id="main" tabIndex={-1} className="min-h-main outline-none">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
        hasCookieConsent={hasCookieConsent}
        subscribeForms={subscribeForms}
      />
    </Aside.Provider>
  );
}

/** The first stop of the keyboard: straight past the header and its menu to the page's content. */
function SkipLink() {
  const {t} = useTranslation();

  return (
    <a
      href="#main"
      className="sr-only rounded-button bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60"
    >
      {t('accessibility.skipToContent')}
    </a>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  const {t} = useTranslation();

  return (
    <Aside type="cart" heading={t('cart.title')}>
      <Suspense fallback={<p className="p-5 text-muted">{t('cart.loading')}</p>}>
        <Await resolve={cart}>{(cart) => <CartMain cart={cart} layout="aside" />}</Await>
      </Suspense>
    </Aside>
  );
}

/**
 * The search, a box near the top of the screen (the whole screen on a phone), opened by the header's search icon.
 * Its input takes focus; each opening starts with an empty search, while a closing one keeps its results until it is
 * gone.
 */
function SearchModal() {
  const {t} = useTranslation();
  const {type, close} = useAside();
  const open = type === 'search';
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [session, setSession] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession(session + 1);
  }

  return (
    <Dialog variant="float" bare open={open} onClose={close} heading={t('search.title')} initialFocusRef={inputRef}>
      {/* Not before the first opening: what the search shows on opening loads only when it opens (B-241). */}
      {session > 0 && <PredictiveSearch key={session} inputRef={inputRef} onNavigate={close} onClose={close} />}
    </Dialog>
  );
}

function MobileMenuAside({
  header,
  publicStoreDomain,
}: {
  header: PageLayoutProps['header'];
  publicStoreDomain: PageLayoutProps['publicStoreDomain'];
}) {
  const {t} = useTranslation();

  return (
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading={t('navigation.menu')} side="left">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside>
    )
  );
}
