import {useTranslation} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import type {ProductFragment} from 'storefrontapi.generated';
import {Badge} from '~/components/ui/Badge';

/**
 * The product's energy class, shown beside its price (B-389): the class's picture as the merchant set it, or its name
 * when there is none, linking to the energy label; and a link to the product information sheet. Nothing without a
 * class.
 */
export function EnergyClass({
  energyClass,
  className = '',
}: {
  energyClass: ProductFragment['energyClass'];
  className?: string;
}) {
  const {t} = useTranslation();
  if (!energyClass) return null;

  const name = t('product.details.energyClass', {label: energyClass.label});
  const mark = energyClass.imageUrl ? (
    <Image src={energyClass.imageUrl} alt={name} width="auto" height={32} className="h-8 w-auto" />
  ) : (
    <Badge variant="neutral">{name}</Badge>
  );

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-small ${className}`}>
      {energyClass.documentUrl ? (
        <a href={energyClass.documentUrl} target="_blank" rel="noreferrer" title={t('product.details.energyLabel')}>
          {mark}
        </a>
      ) : (
        mark
      )}
      {energyClass.productSheetUrl && (
        <a href={energyClass.productSheetUrl} target="_blank" rel="noreferrer" className="inline-link">
          {t('product.details.productSheet')}
        </a>
      )}
    </div>
  );
}
