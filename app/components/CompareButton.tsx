import {Link} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {COMPARE, useProductList} from '~/lib/product-lists';
import {CompareIcon} from '~/components/ui/icons';

/** Adds the product to the comparison the visitor's browser keeps (up to three products), or takes it out. */
export function CompareButton({productId}: {productId: string}) {
  const {t} = useTranslation();
  const {ids, add, remove} = useProductList(COMPARE);
  const inList = ids.includes(productId);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
      <button
        type="button"
        onClick={() => (inList ? remove(productId) : add(productId))}
        className="inline-flex min-h-9 items-center gap-1.5 text-muted hover:text-foreground"
      >
        <CompareIcon className="size-4" />
        {inList ? t('product.compare.remove') : t('product.compare.add')}
      </button>
      {ids.length > 1 && (
        <Link to={comparePath(ids)} className="font-medium underline underline-offset-4">
          {t('product.compare.view', {count: ids.length})}
        </Link>
      )}
    </div>
  );
}

export function comparePath(ids: string[]) {
  return `/compare?ids=${encodeURIComponent(ids.join(','))}`;
}
