import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ShouldRevalidateFunction,
  useRouteError,
  useRouteLoaderData,
} from 'react-router';
import {
  Analytics,
  answeredWithCart,
  clearLatestCart,
  createTranslator,
  getConsentFromCookieHeader,
  getCookieConsent,
  getMarketingPixels,
  isSharedPage,
  shopAnalyticsFrom,
  TranslationsProvider,
  useLatestCart,
  useTranslation,
  useNonce,
} from '@cloudcart/nitrogen';
import {
  GoogleConsentMode,
  PrivacyBanner,
  PrivacyBannerScript,
  SubscribePopups,
  type SubscribePopupsProps,
  useFrameFocusVisible,
  useKeptPages,
  useValidityMessages,
  VisitorDataScript,
} from '@cloudcart/nitrogen-react';
// animate.css, where the form builder's opening and closing animations come from; loaded when a form opens.
import animationsStylesheet from 'animate.css/animate.min.css?url';
import type {Route} from './+types/root';
import {PageLayout} from '~/components/PageLayout';
import {RouteErrorBoundary} from '~/components/RouteError';
import {POLICY_CONSENT_REQUEST_FRAGMENT, PolicyConsentRequest} from '~/components/PolicyConsentRequest';
import {STORE_CONTACT_FRAGMENT} from '~/components/StoreContact';
import {PRIVACY_BANNER_CLASSES} from '~/lib/privacy-banner';
import {SUBSCRIBE_POPUP_CLASSES, subscribeFormLabels} from '~/lib/subscribe-forms';
import {getTranslations} from '~/lib/translations.server';
import {isCartOrWishlistForm} from '~/lib/cart';
import {KEPT_PAGES} from '~/lib/kept-pages';
import {pagePath} from '~/lib/urls';
import appStyles from '~/styles/app.css?url';
// The body font's files the store's texts need, fetched with the stylesheet instead of after it: in time for the first
// paint, so text does not reflow when the font arrives (`font-display: swap`) — on a slow phone that moved the cookie
// bar enough to fail CLS. The same files `app.css` imports (Vite gives one asset one URL).
import fontCyrillic from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-cyrillic-wght-normal.woff2?url';
import fontLatin from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2?url';
import {ifSignedIn} from '~/lib/customer';
import {rootWithVisitorData, useRootWithVisitorData, VISITOR_PATH} from '~/lib/visitor';
import {loadVisitorData, noVisitorData} from '~/lib/visitor.server';
import {validityMessage} from '~/lib/validity';

export type RootLoader = typeof loader;

/** Languages written in Cyrillic: their pages need the font's Cyrillic file. */
const CYRILLIC_LANGUAGES = new Set(['be', 'bg', 'kk', 'ky', 'mk', 'mn', 'ru', 'sr', 'tg', 'uk']);

/**
 * The root's data — menus, shop, cookie banner — is loaded once and kept while
 * the visitor browses. It is loaded again after a form is sent (sign in…) and
 * when a page asks for it with useRevalidator — not after a cart form that
 * answered with the cart, which the page shows from its answer (`useLatestCart`).
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  actionResult,
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  // A form sent: React Router's answer, which is "yes" unless the sender said the post changes
  // nothing the page shows (a pop-up's view count), or the cart's answer is all it changed.
  if (formMethod && formMethod !== 'GET') return answeredWithCart(actionResult) ? false : defaultShouldRevalidate;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

/**
 * The root's data when it is loaded again in the browser — after a form, or a revalidation of the same address — with
 * the visitor's own data on a page cached for every visitor (B-509). Not on the first load: the server's HTML and the
 * early request (`VisitorDataScript`) give that.
 */
export async function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  const root = await rootWithVisitorData(await serverLoader());
  // Its cart is the cart as it is now: the one a cart form answered with gives way, as the data arrives.
  clearLatestCart();
  return root;
}

export function links() {
  return [{rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'}];
}

export async function loader(args: Route.LoaderArgs) {
  // Start the data below the fold without holding up the first byte…
  const deferredData = loadDeferredData(args);

  // …and wait only for what the first screen needs.
  const criticalData = await loadCriticalData(args);

  const {env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    // A page cached for every visitor (`server.ts`): the visitor's own parts come from `/visitor` in the browser.
    visitorFromBrowser: isSharedPage(args.request),
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    // The analytics' shop — its id, language and currency — from the header's answer: nothing asked again (B-453).
    shop: shopAnalyticsFrom(criticalData.header),
    // The browser reports to the storefront's own /api/sf (Nitrogen's default), never across origins to the store.
    // CloudCart Analytics' own address only for the platform's tests (Nitrogen's default is production's).
    consent: {
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      cloudCartAnalyticsUrl: env.PUBLIC_CLOUDCART_ANALYTICS_URL,
    },
  };
}

/**
 * What the page cannot render without: the header, the cookie banner the
 * merchant set up in the GDPR app, and the texts in the store's language, so
 * the first HTML is already translated. If it fails, the page fails.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header, cookieConsent] = await Promise.all([
    // The menu with the shop's name, logo and domain, which the merchant edits: at most a minute old.
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheSettings(),
      variables: {headerMenuHandle: 'main'},
    }),
    getCookieConsent({storefront}),
  ]);

  const translations = await getTranslations(header.localization.language.isoCode);
  // The visitor's stored cookie choice, so the first HTML already holds the banner for one who has not chosen: it
  // paints with the page, not after hydration.
  const consentChoice = getConsentFromCookieHeader(request.headers.get('Cookie'), cookieConsent?.cookieName);

  return {header, cookieConsent, consentChoice, translations};
}

/**
 * What can arrive after the first byte: the footer, the visitor's own data (`loadVisitorData`), a signed-in
 * customer's wishlist and the policies they are asked to accept, and the store's marketing pixels. None of it may
 * throw — the page must render without it.
 */
function loadDeferredData({context, request}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;

  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheSettings(),
      variables: {footerMenuHandle: 'footer'},
    })
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  // What every page needs about the signed-in customer, in one query; null when no one is signed in.
  const signedInCustomer = ifSignedIn(customerAccount, () => customerAccount.query(SIGNED_IN_CUSTOMER_QUERY))
    .then((result) => result?.customer ?? null)
    .catch((error: unknown) => {
      console.error(error);
      return null;
    });
  // Their wishlist, for the heart on every product.
  const wishlist = signedInCustomer.then((customer) => (customer ? customer.wishlistProductIds : null));
  // The policies the store asks them to accept after signing in (`<PolicyConsentRequest>`).
  const policyConsentRequest = signedInCustomer.then((customer) => customer?.policyConsentRequest ?? null);

  // The merchant's marketing pixels (Google, Meta, TikTok), from the cookie banner's own call (`getCookieConsent`).
  const pixels = getMarketingPixels({storefront}).catch((error: unknown) => {
    console.error(error);
    return null;
  });

  return {
    ...(isSharedPage(request) ? noVisitorData() : loadVisitorData({context, request})),
    footer,
    wishlist,
    policyConsentRequest,
    pixels,
    // For the pixels to match their events to the signed-in customer: a hash, never the e-mail.
    customerEmailHash: customerAccount.getEmailHash() ?? null,
    // The sign-in's request for CloudCart Analytics, for the browser to send, once.
    cloudCartAnalytics: customerAccount.takeCloudCartAnalytics(),
  };
}

/**
 * The error page's title. A page that throws renders the root's error boundary, and React Router then reads `meta`
 * only up to the root, so the page's own title is gone: a missing page or an error still gets one, in the store's
 * language. Every page sets its own otherwise.
 */
export const meta: Route.MetaFunction = ({data, error}) => {
  if (!error) return [];
  const t = data ? createTranslator(data.translations) : null;
  const title =
    isRouteErrorResponse(error) && error.status === 404
      ? (t?.('notFound.title') ?? 'Page not found')
      : (t?.('error.title') ?? 'Something went wrong');
  return [{title}, {name: 'robots', content: 'noindex'}];
};

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const lang = data?.header.localization.language.isoCode.toLowerCase() ?? 'en';
  // A frame the keyboard entered — a store's map, a video — shows the focus ring (`app.css`, B-446).
  useFrameFocusVisible();

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Google Consent Mode v2 from the visitor's cookie choice, before any tag loads. The merchant's Google tags are
            pixels the provider runs after consent (`pixels`); never add a vendor's script here (B-398). */}
        <GoogleConsentMode consent={data?.cookieConsent ?? null} />
        {/* A page cached for every visitor: the visitor's own data is asked for at once, and the cookie bar the
            server rendered is hidden before it paints for a visitor who has already chosen. */}
        {data?.visitorFromBrowser && <VisitorDataScript url={VISITOR_PATH} />}
        {data?.visitorFromBrowser && <PrivacyBannerScript consent={data.cookieConsent} />}
        <link rel="preload" href={fontLatin} as="font" type="font/woff2" crossOrigin="anonymous" />
        {CYRILLIC_LANGUAGES.has(lang) && (
          <link rel="preload" href={fontCyrillic} as="font" type="font/woff2" crossOrigin="anonymous" />
        )}
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');
  useKeptPages({pages: KEPT_PAGES, keepAfter: isCartOrWishlistForm});

  if (!data) {
    return <Outlet />;
  }

  return (
    <AppShell data={data}>
      <Outlet />
    </AppShell>
  );
}

/**
 * Everything around a page: the store's language, analytics, the header and footer, the cookie banner, the
 * pop-ups and the policy consent request. Pages and the error page share it.
 */
function AppShell({data: root, children}: {data: Awaited<ReturnType<RootLoader>>; children: React.ReactNode}) {
  // On a page cached for every visitor, their own data over the page's; after a form it comes with the root's
  // (`clientLoader`).
  const data = useRootWithVisitorData(root);
  // The cart a cart form answered with, until the root's own data comes again.
  const cart = useLatestCart(data.cart);

  return (
    <TranslationsProvider translations={data.translations}>
      <Analytics.Provider
        cart={cart}
        shop={data.shop}
        consent={data.consent}
        wishlist={data.wishlist}
        pixels={data.pixels}
        customerEmailHash={data.customerEmailHash}
        cloudCartAnalytics={data.cloudCartAnalytics}
      >
        <PageLayout {...data} cart={cart} hasCookieConsent={Boolean(data.cookieConsent)}>
          {children}
        </PageLayout>
        <PrivacyBanner
          consent={data.cookieConsent}
          storedChoice={data.consentChoice}
          classNames={PRIVACY_BANNER_CLASSES}
        />
        <StorePopups forms={data.subscribeForms} consent={data.cookieConsent} />
        <PolicyConsentRequest />
        <StoreValidityMessages />
      </Analytics.Provider>
    </TranslationsProvider>
  );
}

/** The store's words, not the browser's, for a form the browser will not send (B-454). */
function StoreValidityMessages() {
  const {t} = useTranslation();
  useValidityMessages((reason, control) => validityMessage(reason, control, t));
  return null;
}

/** The store's pop-up subscribe forms, with their own words in the store's language. */
function StorePopups({forms, consent}: Pick<SubscribePopupsProps, 'forms' | 'consent'>) {
  const {t} = useTranslation();

  return (
    <SubscribePopups
      forms={forms}
      consent={consent}
      animationsStylesheet={animationsStylesheet}
      policyUrl={pagePath}
      labels={subscribeFormLabels(t)}
      classNames={SUBSCRIBE_POPUP_CLASSES}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const data = useRouteLoaderData<RootLoader>('root');

  // The root's own loader failed: there is no store data, so no header, footer or translations — and no store language
  // to say this in, so it is the one text written in JSX.
  if (!data) {
    const missing = isRouteErrorResponse(error) && error.status === 404;
    return (
      <div className="mx-auto max-w-reading px-gutter py-24 text-center">
        {/* eslint-disable-next-line starter/no-literal-text -- no translations without the root's data */}
        <h1 className="text-h3">{missing ? 'Page not found' : 'Something went wrong'}</h1>
      </div>
    );
  }

  return (
    <AppShell data={data}>
      <RouteErrorBoundary />
    </AppShell>
  );
}

const SIGNED_IN_CUSTOMER_QUERY = `#graphql
  query SignedInCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      wishlistProductIds
      policyConsentRequest {
        ...PolicyConsentRequest
      }
    }
  }
  ${POLICY_CONSENT_REQUEST_FRAGMENT}
` as const;

// The main menu: an item's collection (`resourceId`) gives its mega-menu panel its products.
const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    title
    url
    openInNewTab
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    items {
      ...ParentMenuItem
    }
  }
` as const;

// The footer's menu: its links only, two levels flattened into one list (B-441).
const FOOTER_MENU_FRAGMENT = `#graphql
  fragment FooterMenuItem on MenuItem {
    id
    title
    url
    openInNewTab
  }
  fragment FooterMenu on Menu {
    items {
      ...FooterMenuItem
      items {
        ...FooterMenuItem
      }
    }
  }
` as const;

// The menus are the CloudCart admin's two system menus: "main" and "footer".
const HEADER_QUERY = `#graphql
  fragment Shop on Shop {
    # For the analytics' shop (shopAnalyticsFrom), with the localization below.
    id
    name
    description
    ianaTimezone
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
          width
          height
        }
      }
    }
    # How the store writes money, for an amount the page writes itself: the chosen price range (T-556).
    currencyFormat {
      symbol
      symbolPosition
      decimals
      wholeUnits
      decimalSeparator
      thousandsSeparator
    }
  }
  query Header($headerMenuHandle: String!) {
    shop {
      ...Shop
    }
    localization {
      language {
        isoCode
      }
      country {
        currency {
          isoCode
          symbol
        }
      }
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;

const FOOTER_QUERY = `#graphql
  query Footer($footerMenuHandle: String!) {
    menu(handle: $footerMenuHandle) {
      ...FooterMenu
    }
    policies {
      id
      page {
        title
        handle
      }
    }
    shop {
      contact {
        ...StoreContact
      }
      gdprRequestTypes
    }
  }
  ${FOOTER_MENU_FRAGMENT}
  ${STORE_CONTACT_FRAGMENT}
` as const;
