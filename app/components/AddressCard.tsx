import type {ReactNode} from 'react';
import {addressLines, useTranslation} from '@cloudcart/nitrogen';
import type {AddressCardFragment} from 'storefrontapi.generated';
import {Badge} from '~/components/ui/Badge';

/** What an address card shows, for the queries of the addresses page and the order. */
export const ADDRESS_CARD_FRAGMENT = `#graphql
  fragment AddressCard on MailingAddress {
    firstName
    lastName
    company
    companyVat
    companyBulstat
    address1
    address2
    zip
    city
    province
    country
    phone
  }
` as const;

/**
 * An address in a card: the name, the company with its VAT and company numbers, the street, the extra line, the
 * postcode and city, the region and country, and the phone — the lines the address has. A title above it, the
 * "Default" badge, and the actions the page gives (`children`) below.
 */
export function AddressCard({
  address,
  title,
  isDefault = false,
  children,
}: {
  address: AddressCardFragment;
  title?: string;
  isDefault?: boolean;
  children?: ReactNode;
}) {
  const {t} = useTranslation();
  const lines = [
    t('format.fullName', {firstName: address.firstName ?? '', lastName: address.lastName ?? ''}).trim(),
    address.company &&
      [address.company, address.companyVat, address.companyBulstat].filter(Boolean).join(t('format.list')),
    ...addressLines(address),
    address.phone,
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col gap-3 rounded-card border border-border p-4 md:p-5">
      {(title || isDefault) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h3 className="text-h5">{title}</h3>}
          {isDefault && <Badge variant="neutral">{t('account.address.default')}</Badge>}
        </div>
      )}
      <address className="not-italic">
        {lines.map((line, index) => (
          // eslint-disable-next-line @eslint-react/no-array-index-key -- a fixed list of lines that never reorders
          <span key={index} className="block">
            {line}
          </span>
        ))}
      </address>
      {children && <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>}
    </div>
  );
}
