import {useTranslation} from '@cloudcart/nitrogen';
import {formatMoney, Money, type MoneyType} from '@cloudcart/nitrogen-react';
import {formatPercent} from '~/lib/format';

type Chargeable = {price?: MoneyType | null; percentage?: string | null};

/** What a charge adds: its price when it has one above nothing, else its percentage above nothing, else nothing. */
function added(charge: Chargeable): {price: MoneyType} | {percentage: number} | null {
  if (charge.price && Number(charge.price.amount) > 0) return {price: charge.price};
  if (charge.percentage && Number(charge.percentage) > 0) return {percentage: Number(charge.percentage)};
  return null;
}

/**
 * What a customization, one of its values or an option on a cart line adds to the price, as text: "+€5.00" or
 * "+10%" (the percentage as `language` writes it, B-435), or null when it adds nothing — for a place that takes only
 * text, a select's option. `Charge` says the same (B-210).
 */
export function chargeText(charge: Chargeable, language: string): string | null {
  const charged = added(charge);
  if (!charged) return null;
  return 'price' in charged
    ? `+${formatMoney(charged.price)}`
    : formatPercent(charged.percentage, language, {signed: true});
}

/** The charge after a name, in brackets: "(+€5.00)", the amount through `Money`, or "(+10%)". Nothing when none. */
export function Charge({charge, className = ''}: {charge: Chargeable; className?: string}) {
  const {language} = useTranslation();
  const charged = added(charge);
  if (!charged) return null;

  return (
    <span className={`ml-1 font-normal text-muted ${className}`}>
      (
      {'price' in charged ? (
        <>
          +<Money data={charged.price} />
        </>
      ) : (
        formatPercent(charged.percentage, language, {signed: true})
      )}
      )
    </span>
  );
}
