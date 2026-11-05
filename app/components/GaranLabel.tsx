import {useState} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {Dialog} from '~/components/Dialog';
import type {GaranLabelFragment} from 'storefrontapi.generated';

/**
 * The EU durability-guarantee (GARAN) label of what the buyer is looking at — the merchant's declared
 * guarantee beyond the statutory two years, on the EU's own harmonised artwork.
 *
 * `NESTED`, which the store sets by default, shows the compact badge and opens the full label on the first
 * click, the way the EU's practical guidelines want it online; `FULL` puts the whole label on the page.
 * The pictures are the platform's, so nothing here draws or composes the label: the API hands over two
 * image addresses, one for the badge and one for the full label of this very variant.
 *
 * Nothing at all when the product has no such guarantee.
 */
export function GaranLabel({label, className = ''}: {label?: GaranLabelFragment | null; className?: string}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);

  if (!label?.labelImageUrl) return null;

  const alt = label.alt ?? t('product.details.garanLabelAlt', {term: label.years});
  const full = (
    <img
      src={label.labelImageUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-auto w-full max-w-garan-label"
    />
  );

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      {label.displayType === 'FULL' || !label.nestedImageUrl ? (
        full
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            title={t('product.details.garanOpen')}
            className="cursor-pointer rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <img src={label.nestedImageUrl} alt={alt} loading="lazy" decoding="async" className="h-10 w-auto" />
          </button>
          <Dialog open={open} onClose={() => setOpen(false)} heading={t('product.details.garanHeading')}>
            <div className="flex flex-col items-center gap-3 p-5">
              {full}
              {label.infoUrl && (
                <a href={label.infoUrl} target="_blank" rel="noreferrer" className="inline-link text-small">
                  {t('product.details.garanInfo')}
                </a>
              )}
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}
