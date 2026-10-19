import {Link, useLoaderData, useLocation} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/gdpr._index';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {GDPR_REQUEST_TYPES_QUERY} from '~/lib/gdpr';
import {signInPath} from '~/lib/urls';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('account.nav.yourData'));

/**
 * /gdpr — what a visitor can do about the personal data the store keeps, as the
 * CloudCart storefront's GDPR page offers it: download a copy (signed-in
 * customers), see their account data, ask for a copy or for deletion. A store
 * without the GDPR app has no such page: 404.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;
  const [{shop}, isLoggedIn] = await Promise.all([
    storefront.query(GDPR_REQUEST_TYPES_QUERY, {cache: storefront.CacheSettings()}),
    customerAccount.isLoggedIn(),
  ]);
  if (!shop.gdprRequestTypes.length) throw new Response('Not found', {status: 404});

  return {isLoggedIn, requestTypes: shop.gdprRequestTypes};
}

const DOWNLOADS = [
  {to: '/gdpr/download/personal-information', label: 'gdpr.file.personalInformation'},
  {to: '/gdpr/download/addresses', label: 'gdpr.file.addresses'},
  {to: '/gdpr/download/orders', label: 'gdpr.file.orders'},
] as const;

export default function YourData() {
  const {t} = useTranslation();
  const location = useLocation();
  const {isLoggedIn, requestTypes} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-8 px-gutter py-10 md:px-gutter-md">
      <div className="flex flex-col gap-2">
        <h1 className="text-title">{t('account.nav.yourData')}</h1>
        <p className="text-muted">{t('gdpr.intro')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title={t('gdpr.download')}>
          {isLoggedIn ? (
            DOWNLOADS.map((file) => (
              // A file download, not a page: a plain link, so the router does not try to render it.
              <a key={file.to} href={file.to} download className="inline-link">
                {t('gdpr.csv', {name: t(file.label)})}
              </a>
            ))
          ) : (
            <Link to={signInPath(location.pathname)} className="inline-link">
              {t('gdpr.signInToDownload')}
            </Link>
          )}
        </Section>

        {isLoggedIn && (
          <Section title={t('gdpr.inAccount')}>
            <Link to="/account" className="inline-link">
              {t('account.nav.profile')}
            </Link>
            <Link to="/account/address/shipping" className="inline-link">
              {t('account.nav.shippingAddresses')}
            </Link>
            <Link to="/account/gdpr" className="inline-link">
              {t('account.nav.policies')}
            </Link>
            <Link to="/account/gdpr-requests" className="inline-link">
              {t('account.nav.privacyRequests')}
            </Link>
          </Section>
        )}

        <Section title={t('gdpr.askUs')}>
          {requestTypes.includes('DOWNLOAD') && (
            <Link to="/gdpr/request/download" className="inline-link">
              {t('gdpr.askCopy')}
            </Link>
          )}
          {requestTypes.includes('DELETE') && (
            <Link to="/gdpr/request/delete" className="inline-link">
              {t('gdpr.askDelete')}
            </Link>
          )}
          <Link to="/gdpr/request" className="inline-link">
            {t('gdpr.askOther')}
          </Link>
        </Section>
      </div>
    </div>
  );
}

/** A box of links under its title. */
function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="flex flex-col items-start gap-2 rounded-card border border-border p-5">
      <h2 className="mb-1 text-h5">{title}</h2>
      {children}
    </section>
  );
}
