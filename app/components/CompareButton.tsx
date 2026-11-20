import {Link} from 'react-router';
import {useAnalytics, useTranslation} from '@cloudcart/nitrogen';
import {COMPARE, useProductList} from '~/lib/product-lists';
import {CompareIcon} from '~/components/ui/icons';

/**
 * Adds the product to the comparison the visitor's browser keeps (up to three products), or takes it out; a fourth
 * drops the oldest. Each change is published for the visitor's signals.
 */
export function CompareButton({productId}: {productId: string}) {
  const {t} = useTranslation();
  const {ids, add, remove} = useProductList(COMPARE);
  const {publish, shop} = useAnalytics();
  const inList = ids.includes(productId);
  const toggle = () => {
    if (inList) {
      remove(productId);
      publish('product_removed_from_comparison', {productId, shop});
      return;
    }
    const dropped = ids.slice(COMPARE.max - 1);
    add(productId);
    publish('product_added_to_comparison', {productId, shop});
    for (const id of dropped) publish('product_removed_from_comparison', {productId: id, shop});
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
      <button
        type="button"
        onClick={toggle}
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
