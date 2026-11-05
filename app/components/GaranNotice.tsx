import {useRouteLoaderData} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {RootLoader} from '~/root';

/**
 * The EU legal-guarantee notice: the reminder that every product carries the statutory two-year guarantee,
 * which the seller must show before the purchase (Directive 2024/825).
 *
 * The store's own checkout shows it, so a cart handed over to it needs nothing here. This is for the places
 * where the order is placed without that page — the fast order and the wallet buttons. The artwork and the
 * link are the official ones, in the shopper's language, as the API gives them; nothing when the store does
 * not run the app.
 */
export function GaranNotice({className = ''}: {className?: string}) {
  const {t} = useTranslation();
  const notice = useRouteLoaderData<RootLoader>('root')?.header.shop.garanNotice;

  if (!notice) return null;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <img
        src={notice.imageUrl}
        alt={t('product.details.garanNoticeAlt')}
        loading="lazy"
        decoding="async"
        className="h-auto w-full max-w-garan-notice"
      />
      <a href={notice.infoUrl} target="_blank" rel="noreferrer" className="inline-link text-small">
        {t('product.details.garanNoticeLink')}
      </a>
    </div>
  );
}
