import {addressLines, useTranslation} from '@cloudcart/nitrogen';
import type {StoreContactFragment} from 'storefrontapi.generated';
import {telHref} from '~/lib/urls';

/** How to reach the store, from its settings (`shop.contact`). */
export const STORE_CONTACT_FRAGMENT = `#graphql
  fragment StoreContact on ShopContact {
    email
    phone
    companyName
    registrationNumber
    vatNumber
    address {
      address1
      city
      zip
      country
    }
  }
` as const;

/**
 * How to reach the store, from its settings: the company (or the store's name) with its registration and VAT numbers,
 * the address, the phone and the e-mail — each only when the merchant set it; nothing when none is. The footer and
 * the contact page show it.
 */
export function StoreContact({
  name,
  contact,
  className = 'text-muted',
}: {
  name: string;
  contact: StoreContactFragment;
  className?: string;
}) {
  const {t} = useTranslation();
  const {email, phone, companyName, registrationNumber, vatNumber, address} = contact;
  const lines = addressLines(address);
  if (!email && !phone && !companyName && !registrationNumber && !vatNumber && !lines.length) return null;

  return (
    <address className={`flex flex-col gap-1 not-italic ${className}`}>
      <span className="font-medium text-foreground">{companyName || name}</span>
      {registrationNumber && <span>{t('contact.registrationNumber', {number: registrationNumber})}</span>}
      {vatNumber && <span>{t('contact.vatNumber', {number: vatNumber})}</span>}
      {lines.length > 0 && <span>{lines.join(t('format.list'))}</span>}
      {phone && (
        <a href={telHref(phone)} className="hover:text-foreground">
          {phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="hover:text-foreground">
          {email}
        </a>
      )}
    </address>
  );
}
