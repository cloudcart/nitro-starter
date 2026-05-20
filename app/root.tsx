import {Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData, useRouteError, isRouteErrorResponse, type MetaFunction} from 'react-router';
import type {Route} from './+types/root';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {AsideProvider, Aside} from '~/components/Aside';
import {CartDrawer} from '~/components/CartDrawer';
import {PageLayout} from '~/components/PageLayout';
import '~/app.css';

export const meta: MetaFunction = () => getSeoMeta({title: 'Nitrogen | Modern Commerce'});

export const shouldRevalidate: Route.ShouldRevalidateFunction = ({formMethod, currentUrl, nextUrl}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const [shop, headerMenu, footerMenu, wishlistIds] = await Promise.all([
    ctx.storefront.getShop(),
    ctx.storefront.getMenu('main-menu'),
    ctx.storefront.getMenu('footer'),
    ctx.customerAccount.isLoggedIn()
      ? ctx.customerAccount.getWishlistIds().catch(() => [])
      : Promise.resolve([]),
  ]);

  return {shop, headerMenu, footerMenu, cart: ctx.cart.get(), wishlistIds};
}

export function Layout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<typeof loader>('root');
  const shop = data?.shop ?? {name: 'Nitrogen', description: null};
  const cart = data?.cart ?? Promise.resolve(null);

  return (
    <AsideProvider>
      <Aside type="cart" heading="CART">
        <CartDrawer cart={cart} />
      </Aside>
      <PageLayout
        shop={shop}
        headerMenu={data?.headerMenu ?? null}
        footerMenu={data?.footerMenu ?? null}
        cart={cart}
      >
        <Outlet />
      </PageLayout>
    </AsideProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let msg = 'Unknown error', status = 500;
  if (isRouteErrorResponse(error)) { msg = error.data?.message ?? error.statusText; status = error.status; }
  else if (error instanceof Error) { msg = error.message; }
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-10">
        <div className="text-center py-16">
          <h1 className="text-8xl font-extrabold text-gray-200 leading-none">{status}</h1>
          <p className="text-gray-500 mt-2">{msg}</p>
          <a href="/" className="text-brand font-semibold mt-4 inline-block">Go Home</a>
        </div>
      </main>
    </div>
  );
}
