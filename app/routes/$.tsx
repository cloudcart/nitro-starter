import type {Route} from './+types/$';

/** Any address no route serves: a 404, which `storefrontRedirect` in server.ts may turn into the merchant's redirect. */
export async function loader({url}: Route.LoaderArgs) {
  throw new Response(`${url.pathname} not found`, {
    status: 404,
  });
}

export default function CatchAllPage() {
  return null;
}
