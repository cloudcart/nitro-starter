import {useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {Dialog} from '~/components/Dialog';
import type {RootLoader} from '~/root';

/**
 * The EU legal-guarantee notice: the reminder that every product carries the statutory two-year guarantee,
 * which the seller must show before the purchase (Directive 2024/825).
 *
 * A trigger opens the official notice in a dialog, the way the store's own checkout shows it: the artwork is a
 * whole page of legal text with its QR code, so it is unreadable at the size of a badge, and at about half a
 * megabyte it has no business loading with the page. It is fetched on the first open and kept afterwards. Beside
 * it stands the required link to the same destination as the QR code.
 *
 * The store's own checkout shows this itself, so a cart handed over to it needs nothing here. This is for the
 * places where the order is placed without that page — the fast order and the wallet buttons. Nothing when the
 * store does not run the app.
 */
export function GaranNotice({className = ''}: {className?: string}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const notice = useRouteLoaderData<RootLoader>('root')?.header.shop.garanNotice;

  if (!notice) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpened(true);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className="inline-link cursor-pointer text-small"
      >
        {t('product.details.garanNoticeTrigger')}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} heading={t('product.details.garanNoticeHeading')}>
        <div className="flex flex-col items-start gap-3 p-5">
          {opened && (
            <img
              src={notice.imageUrl}
              alt={t('product.details.garanNoticeAlt')}
              decoding="async"
              className="h-auto w-full"
            />
          )}
          <a href={notice.infoUrl} target="_blank" rel="noreferrer" className="inline-link text-small">
            {t('product.details.garanNoticeLink')}
          </a>
        </div>
      </Dialog>
    </div>
  );
}
