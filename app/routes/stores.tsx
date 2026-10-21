import {Link, useLoaderData} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/stores';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import {ListingHeader} from '~/components/ListingHeader';
import {storePath, telHref} from '~/lib/urls';
import {EmptyState} from '~/components/ui/EmptyState';
import {ButtonLink} from '~/components/ui/Button';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({matches}) => {
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: t('stores.title'),
    path: '/stores',
    description: t('seo.stores', {store: storeName(matches)}),
    crumbs: [{title: t('stores.title')}],
  });
};

/** /stores — the merchant's physical stores and pickup points. */
export async function loader({context}: Route.LoaderArgs) {
  // The merchant's shops are settings they edit: refreshed at most once a minute (B-440).
  const {storeLocations} = await context.storefront.query(STORES_QUERY, {cache: context.storefront.CacheSettings()});
  return {stores: storeLocations};
}

export default function Stores() {
  const {t} = useTranslation();
  const {stores} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={[{title: t('stores.title')}]} title={t('stores.title')} />
      {!stores.length ? (
        // No shop to visit: shopping here is the way on (B-437).
        <EmptyState
          text={t('stores.none')}
          action={
            <ButtonLink to="/categories" prefetch="intent" variant="secondary">
              {t('actions.browseCategories')}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <li key={store.id} className="flex flex-col gap-2 rounded-card border border-border p-4 md:p-5">
              <h2 className="text-h5">
                {store.urlHandle ? (
                  <Link to={storePath(store.urlHandle)} className="underline-offset-4">
                    {store.name}
                  </Link>
                ) : (
                  store.name
                )}
              </h2>
              {store.address?.text && <p className="text-muted">{store.address.text}</p>}
              {store.worktimeText && <p className="text-muted">{store.worktimeText}</p>}
              {store.phone && (
                <a href={telHref(store.phone)} className="self-start">
                  {store.phone}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STORES_QUERY = `#graphql
  query Stores {
    storeLocations {
      id
      name
      urlHandle
      phone
      worktimeText
      address {
        text
      }
    }
  }
` as const;
