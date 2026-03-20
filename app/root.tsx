import {Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData, useRouteError, isRouteErrorResponse, type MetaFunction} from 'react-router';
import type {Route} from './+types/root';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';

export const meta: MetaFunction = () => getSeoMeta({title: 'Nitro | Modern Commerce'});

export const shouldRevalidate: Route.ShouldRevalidateFunction = ({formMethod, currentUrl, nextUrl}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const [shop, headerMenu] = await Promise.all([
    ctx.storefront.getShop(),
    ctx.storefront.getMenu('main-menu'),
  ]);
  return {shop, headerMenu};
}

export function Layout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
      <body>{children}<ScrollRestoration /><Scripts /></body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<typeof loader>('root');
  return <main><Outlet /></main>;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let msg = 'Unknown error', status = 500;
  if (isRouteErrorResponse(error)) { msg = error.data?.message ?? error.statusText; status = error.status; }
  else if (error instanceof Error) { msg = error.message; }
  return <div style={{textAlign:'center',padding:'3rem'}}><h1>{status}</h1><p>{msg}</p></div>;
}
