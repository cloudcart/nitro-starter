import {useLoaderData} from 'react-router';
import {useTranslation, type Translate} from '@cloudcart/nitrogen';
import type {Route} from './+types/store.$handle';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import type {Crumb} from '~/components/Breadcrumbs';
import {ListingHeader} from '~/components/ListingHeader';
import {formatWeekday} from '~/lib/format';
import {storePath, telHref} from '~/lib/urls';
import {RichText, keptPageLoader} from '@cloudcart/nitrogen-react';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

// A page that throws is titled by the root's `meta`.
export const meta: Route.MetaFunction = ({data, matches, params}) => {
  if (!data) return [];
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: data.store.name,
    // The API's handle, not the address's: one canonical however the address writes it (B-316).
    path: storePath(data.store.urlHandle ?? params.handle),
    description: t('seo.store', {name: data.store.name, store: storeName(matches)}),
    crumbs: storeCrumbs(data.store.name, t),
  });
};

/** A store's breadcrumb: the stores, then the store. */
function storeCrumbs(name: string, t: Translate): Crumb[] {
  return [{title: t('stores.title'), to: '/stores'}, {title: name}];
}

/** /store/{handle} — one of the merchant's stores: address, hours, contact and map. */
export async function loader({context, params}: Route.LoaderArgs) {
  const {storeLocation: store, errors} = await context.storefront.query(STORE_QUERY, {
    variables: {handle: params.handle},
    // The merchant's shop is a setting they edit: refreshed at most once a minute (B-440).
    cache: context.storefront.CacheSettings(),
  });

  if (!store) throw missingResource(errors, `Store ${params.handle} not found`);

  return {store};
}

export default function Store() {
  const {t, language} = useTranslation();
  const {store} = useLoaderData<typeof loader>();
  const {latitude, longitude} = store;

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={storeCrumbs(store.name, t)} title={store.name} />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4">
          {store.address?.text && <p>{store.address.text}</p>}
          {store.phone && (
            <a href={telHref(store.phone)} className="self-start">
              {store.phone}
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="self-start">
              {store.email}
            </a>
          )}
          {store.workingHours.some((day) => day.active) ? (
            <section aria-labelledby="store-hours" className="flex flex-col gap-2">
              <h2 id="store-hours" className="text-h5">
                {t('stores.hours')}
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                {store.workingHours.map((day) => (
                  <div key={day.day} className="contents">
                    <dt className="text-muted first-letter:uppercase">{formatWeekday(day.day ?? '', language)}</dt>
                    <dd>{day.active ? `${day.from} – ${day.to}` : t('stores.closed')}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            store.worktimeText && <p className="text-muted">{store.worktimeText}</p>
          )}
          {store.description && <RichText data={store.description} headingStart={2} className="prose prose-tokens" />}
        </div>
        {latitude != null && longitude != null && (
          <iframe
            title={t('stores.map', {name: store.name})}
            className="aspect-[4/3] w-full rounded-card border border-border"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.006},${longitude + 0.01},${latitude + 0.006}&marker=${latitude},${longitude}`}
          />
        )}
      </div>
    </div>
  );
}

const STORE_QUERY = `#graphql
  query StoreLocation($handle: String!) {
    storeLocation(urlHandle: $handle) {
      urlHandle
      name
      description
      phone
      email
      latitude
      longitude
      worktimeText
      address {
        text
      }
      workingHours {
        day
        from
        to
        active
      }
    }
  }
` as const;
