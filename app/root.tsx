import {Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData, useRouteError, isRouteErrorResponse, type MetaFunction} from 'react-router';
import type {Route} from './+types/root';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Header} from '~/components/Header';
import {Footer} from '~/components/Footer';
import {AsideProvider, Aside} from '~/components/Aside';
import {CartDrawer} from '~/components/CartDrawer';
import appStyles from '~/styles/app.css?url';

export const meta: MetaFunction = () => getSeoMeta({title: 'Nitro | Modern Commerce'});

export const links: Route.LinksFunction = () => {
  return [{rel: 'stylesheet', href: appStyles}];
};

export const shouldRevalidate: Route.ShouldRevalidateFunction = ({formMethod, currentUrl, nextUrl}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const [shop, headerMenu, footerMenu] = await Promise.all([
    ctx.storefront.getShop(),
    ctx.storefront.getMenu('main-menu'),
    ctx.storefront.getMenu('footer'),
  ]);

  return {shop, headerMenu, footerMenu, cart: ctx.cart.get()};
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
  const shop = data?.shop ?? {name: 'Nitro', description: null};

  return (
    <AsideProvider>
      <Aside type="cart" heading="CART">
        <CartDrawer cart={data?.cart ?? Promise.resolve(null)} />
      </Aside>
      <div className="page-layout">
        <Header shop={shop} menu={data?.headerMenu ?? null} cart={data?.cart ?? Promise.resolve(null)} />
        <main>
          <Outlet />
        </main>
        <Footer shop={shop} menu={data?.footerMenu ?? null} />
      </div>
    </AsideProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let msg = 'Unknown error', status = 500;
  if (isRouteErrorResponse(error)) { msg = error.data?.message ?? error.statusText; status = error.status; }
  else if (error instanceof Error) { msg = error.message; }
  return (
    <div className="page-layout">
      <main>
        <div className="not-found">
          <h1>{status}</h1>
          <p>{msg}</p>
          <a href="/">Go Home</a>
        </div>
      </main>
    </div>
  );
}
