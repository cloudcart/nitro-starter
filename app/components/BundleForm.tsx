import {useState} from 'react';
import {Link} from 'react-router';
import {CartForm, useTranslation} from '@cloudcart/nitrogen';
import {Image, Money} from '@cloudcart/nitrogen-react';
import type {ProductFragment} from 'storefrontapi.generated';
import {ADD_TO_CART_FETCHER_KEY} from '~/lib/cart';
import {productPath} from '~/lib/urls';
import {useAside} from './Aside';
import {CartActionMessages} from '~/components/CartActionMessages';
import {Button} from '~/components/ui/Button';
import {Select} from '~/components/ui/Field';
import {QuantityStepper} from '~/components/ui/QuantityStepper';

type Bundle = NonNullable<ProductFragment['bundle']>;
type BundleItem = Bundle['products'][number];

/**
 * A bundle: the products it holds, a variant chosen for each, and one button
 * that adds them together. In the cart they stay together under the bundle.
 * The server prices it; what is shown here only describes the merchant's rule.
 */
export function BundleForm({productId, bundle}: {productId: string; bundle: Bundle}) {
  const {t} = useTranslation();
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(bundle.products.map((item, index) => [String(index), firstAvailable(item)?.id ?? ''])),
  );
  // Keyed by position: a bundle may hold the same product twice.
  const complete = bundle.products.every((_item, index) => choices[String(index)]);

  return (
    <div className="flex flex-col gap-4">
      {bundle.priceType === 'PERCENT' && bundle.discountPercent ? (
        <p className="text-small font-medium">{t('product.bundle.discount', {percent: bundle.discountPercent})}</p>
      ) : null}
      <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
        {bundle.products.map((item, index) => {
          const {product} = item;
          const variants = product.variants.nodes;
          return (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- a position is the item's identity: the same product may appear twice, and the list never reorders.
            <li key={`${product.id}-${index}`} className="flex gap-3 p-3">
              {!item.hideThumbnail && product.featuredImage && (
                <Image data={product.featuredImage} aspectRatio="1/1" width={64} className="size-16 object-contain" />
              )}
              <div className="flex flex-1 flex-col gap-1 text-small">
                <Link to={productPath(product.handle)} className="font-medium">
                  {item.quantity > 1
                    ? t('format.quantityOf', {quantity: item.quantity, item: product.title})
                    : product.title}
                </Link>
                {item.showDetails && product.shortDescription && (
                  <p className="text-muted">{product.shortDescription}</p>
                )}
                {item.showPrice && item.priceInBundle && <Money data={item.priceInBundle} className="text-muted" />}
                {variants.length > 1 && (
                  <Select
                    aria-label={t('product.bundle.choose', {title: product.title})}
                    className="mt-1"
                    value={choices[String(index)]}
                    onChange={(event) => setChoices((current) => ({...current, [String(index)]: event.target.value}))}
                  >
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id} disabled={!variant.availableForSale}>
                        {variant.availableForSale ? variant.title : t('product.bundle.soldOut', {title: variant.title})}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {bundle.compareAtPrice && (
        <Money data={bundle.compareAtPrice}>
          {(amount) => <p className="text-small text-muted">{t('product.bundle.separately', {amount})}</p>}
        </Money>
      )}
      <CartForm
        route="/cart"
        fetcherKey={ADD_TO_CART_FETCHER_KEY}
        action={CartForm.ACTIONS.BundleAdd}
        inputs={{
          bundle: {
            bundleId: productId,
            quantity,
            items: bundle.products.map((_item, index) => ({merchandiseId: choices[String(index)]!})),
          },
        }}
      >
        {(fetcher) => (
          <>
            <div className="flex items-stretch gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} />
              <Button
                type="submit"
                onClick={() => open('cart')}
                disabled={!complete}
                loading={fetcher.state !== 'idle'}
                className="flex-1"
              >
                {t('product.bundle.add')}
              </Button>
            </div>
            <CartActionMessages data={fetcher.state === 'idle' ? fetcher.data : null} />
          </>
        )}
      </CartForm>
    </div>
  );
}

function firstAvailable(item: BundleItem) {
  return item.product.variants.nodes.find((variant) => variant.availableForSale) ?? item.product.variants.nodes[0];
}
