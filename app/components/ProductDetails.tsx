import {useTranslation} from '@cloudcart/nitrogen';
import {RichText} from '@cloudcart/nitrogen-react';
import type {ProductFragment} from 'storefrontapi.generated';
import {AccordionItem} from '~/components/ui/Accordion';
import {formatBytes, formatLength} from '~/lib/format';

/**
 * Everything the merchant wrote about the product, each part opening in place: the description (open) under the name
 * the merchant gave it (T-552), the merchant's own tabs (T-551), the specifications and dimensions, and the documents
 * to download. The energy class is beside the price (`EnergyClass`, B-389).
 */
export function ProductDetails({product}: {product: ProductFragment}) {
  const {t, language} = useTranslation();
  const {descriptionHtml, descriptionTitle, tabs, properties, dimensions, files} = product;
  // Each length with its unit as the visitor's language writes them: "12.5 cm", "12,5 см" (B-435).
  const measures = dimensions
    ? (
        [
          [t('product.details.length'), dimensions.length],
          [t('product.details.width'), dimensions.width],
          [t('product.details.height'), dimensions.height],
        ] as const
      ).flatMap(([label, value]) => (value == null ? [] : [[label, formatLength(value, dimensions.unit, language)]]))
    : [];
  const hasDownloads = files.nodes.length > 0;

  if (!descriptionHtml && !tabs.length && !properties.length && !measures.length && !hasDownloads) return null;

  return (
    <div className="border-t border-border">
      {descriptionHtml && (
        <AccordionItem title={descriptionTitle ?? t('product.details.description')} defaultOpen>
          {/* Under the product's h1: an accordion's title is no heading (B-448). */}
          <RichText data={descriptionHtml} headingStart={2} className="prose prose-tokens max-w-none" />
        </AccordionItem>
      )}

      {tabs.map((tab) => (
        <AccordionItem key={tab.id} title={tab.title}>
          <RichText data={tab.contentHtml} headingStart={2} className="prose prose-tokens max-w-none" />
        </AccordionItem>
      ))}

      {(properties.length > 0 || measures.length > 0) && (
        <AccordionItem title={t('product.details.specifications')}>
          <dl className="divide-y divide-border text-small">
            {properties.map((property) => (
              <div key={property.name} className="grid grid-cols-2 gap-4 py-2.5">
                <dt className="text-muted">{property.name}</dt>
                <dd>{property.values.join(t('format.list'))}</dd>
              </div>
            ))}
            {measures.map(([label, value]) => (
              <div key={label} className="grid grid-cols-2 gap-4 py-2.5">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </AccordionItem>
      )}

      {hasDownloads && (
        <AccordionItem title={t('product.details.downloads')}>
          <div className="flex flex-col gap-4 text-small">
            {files.nodes.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.nodes.map((file) => (
                  <li key={file.id}>
                    <a href={file.url} target="_blank" rel="noreferrer" className="inline-link">
                      {file.name}
                    </a>
                    {file.fileSize ? (
                      <span className="ml-2 text-muted">({formatBytes(file.fileSize, language)})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AccordionItem>
      )}
    </div>
  );
}
