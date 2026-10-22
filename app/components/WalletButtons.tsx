import {useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import {
  type CloudCartPayExpressMerchandise,
  type CloudCartPayExpressProductRules,
  useTranslation,
} from '@cloudcart/nitrogen';
import {CloudCartPayExpress} from '@cloudcart/nitrogen-react';
import type {MoneyV2} from '@cloudcart/nitrogen/storefront-api-types';
import type {RootLoader} from '~/root';

/** Loads Paypercut's script in the browser only (`paypercut.client`); one function, so the buttons are drawn once. */
const loadPaypercut = () => import('~/lib/paypercut.client').then((sdk) => sdk.Paypercut);

/**
 * CloudCart Pay's Apple Pay and Google Pay buttons under the add to cart, as the store's own product page shows them:
 * as the merchant set them up (the root's `cloudCartPayExpress`), for what the form holds now. The store's refusal —
 * a customization left out, no courier for the address, a declined card — shows under them (T-619).
 */
export function WalletButtons({
  rules,
  signedIn,
  merchandise,
  amount,
}: {
  /** `product.cloudCartPayExpress`. */
  rules: CloudCartPayExpressProductRules | null | undefined;
  signedIn: boolean;
  /** The line or bundle the form holds; null while the buyer must still choose. */
  merchandise: CloudCartPayExpressMerchandise | null;
  /** The price the page shows. */
  amount: Pick<MoneyV2, 'amount' | 'currencyCode'>;
}) {
  const {t} = useTranslation();
  const root = useRouteLoaderData<RootLoader>('root');
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  return (
    <>
      <CloudCartPayExpress
        settings={root?.cloudCartPayExpress}
        rules={rules}
        signedIn={signedIn}
        merchandise={merchandise}
        amount={amount}
        loadPaypercut={loadPaypercut}
        labels={{subtotal: t('product.wallet.subtotal'), shipping: t('product.wallet.shipping')}}
        locale={root?.header.localization.language.isoCode.toLowerCase()}
        onError={(message) => setError(message ?? t('product.wallet.error'))}
        onProcessing={() => {
          setError(null);
          setPaid(true);
        }}
        classNames={{
          // Paypercut draws the buttons in its own frames: their corners come from this property, the theme's buttons'.
          root: 'flex flex-col gap-2 [--cc-cloudcart-pay-express-button-radius:var(--radius-button)] data-[layout=side-by-side]:flex-row',
          wallet: 'relative min-w-0 flex-1',
        }}
      />
      {error && !paid && (
        <p role="alert" className="text-small text-error">
          {error}
        </p>
      )}
      {paid && (
        <p role="status" className="text-small text-muted">
          {t('product.wallet.processing')}
        </p>
      )}
    </>
  );
}
