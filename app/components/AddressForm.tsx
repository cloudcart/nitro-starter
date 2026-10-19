import {Form, Link} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {CheckoutFieldVisibility} from '@cloudcart/nitrogen/storefront-api-types';
import type {AccountAddressFieldsFragment, AccountAddressFragment} from 'storefrontapi.generated';
import {Field, type FormError, FormStatus, SelectField} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import {Checkbox} from '~/components/ui/Field';
import {useSubmission} from '~/lib/action';

/** A delivery address, or a billing address (which also takes the company's details). */
export type AddressKind = 'shipping' | 'billing';

/**
 * Adds or edits one address, posted to `action`. Which fields it asks for, and which are required, is the store's
 * checkout setting (`fields`): a hidden one is not asked. The country is chosen from the countries the store sells
 * to. The page passes the store's refusals (`errors`); each shows under its field.
 */
export function AddressForm({
  kind,
  fields,
  countries,
  defaults,
  isDefault = false,
  makeDefault = false,
  action,
  errors,
}: {
  kind: AddressKind;
  fields: AccountAddressFieldsFragment;
  countries: Array<{isoCode: string; name: string}>;
  defaults: Partial<AccountAddressFragment>;
  /** The address is already the default: the choice is not offered. */
  isDefault?: boolean;
  /** Offer it as the default, ticked (the first address). */
  makeDefault?: boolean;
  action: string;
  errors?: FormError[];
}) {
  const {t} = useTranslation();
  // Its own intent: the list beside it posts "default" and "delete" to the same action.
  const intent = defaults.id ? 'update' : 'create';
  const busy = useSubmission(action)?.get('intent') === intent;
  // Company details are invoicing details: the store asks for them on billing addresses.
  const company = kind === 'billing';

  // The inputs shown, whose own errors appear beside them; the others' in the status (B-424).
  const shown = ['countryCode', 'city'];
  const input = (visibility: CheckoutFieldVisibility, props: React.ComponentProps<typeof Field>) => {
    if (visibility === 'HIDDEN') return null;
    shown.push(props.name);
    return <Field {...props} required={visibility === 'REQUIRED'} errors={errors} />;
  };

  return (
    <Form method="post" action={action} className="flex flex-col gap-4 rounded-card border border-border p-4 md:p-5">
      <input type="hidden" name="intent" value={intent} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        {input(fields.firstName, {
          label: t('form.firstName'),
          name: 'firstName',
          defaultValue: defaults.firstName ?? '',
          autoComplete: 'given-name',
        })}
        {input(fields.lastName, {
          label: t('form.lastName'),
          name: 'lastName',
          defaultValue: defaults.lastName ?? '',
          autoComplete: 'family-name',
        })}
        {company &&
          input(fields.companyName, {
            label: t('account.address.company'),
            name: 'company',
            defaultValue: defaults.company ?? '',
            autoComplete: 'organization',
          })}
        {company &&
          input(fields.companyVat, {
            label: t('account.address.vat'),
            name: 'companyVat',
            defaultValue: defaults.companyVat ?? '',
          })}
        {company &&
          input(fields.companyBulstat, {
            label: t('account.address.bulstat'),
            name: 'companyBulstat',
            defaultValue: defaults.companyBulstat ?? '',
          })}
        {company &&
          input(fields.companyMol, {
            label: t('account.address.mol'),
            name: 'companyMol',
            defaultValue: defaults.companyMol ?? '',
          })}
        <SelectField
          label={t('account.address.country')}
          name="countryCode"
          required
          placeholder={t('account.address.chooseCountry')}
          options={countries.map((entry) => ({value: entry.isoCode, label: entry.name}))}
          defaultValue={defaults.countryCodeV2 ?? ''}
          autoComplete="country"
          errors={errors}
        />
        {input(fields.state, {
          label: t('account.address.region'),
          name: 'province',
          defaultValue: defaults.province ?? '',
          autoComplete: 'address-level1',
        })}
        <Field
          label={t('account.address.city')}
          name="city"
          required
          defaultValue={defaults.city ?? ''}
          autoComplete="address-level2"
          errors={errors}
        />
        {input(fields.postCode, {
          label: t('account.address.zip'),
          name: 'zip',
          defaultValue: defaults.zip ?? '',
          autoComplete: 'postal-code',
        })}
        {input(fields.streetName, {
          label: t('account.address.street'),
          name: 'address1',
          defaultValue: defaults.streetName ?? '',
          autoComplete: 'address-line1',
        })}
        {input(fields.streetNumber, {
          label: t('account.address.number'),
          name: 'streetNumber',
          defaultValue: defaults.streetNumber ?? '',
        })}
        {input(fields.additionalInformation, {
          label: t('account.address.address2'),
          name: 'address2',
          defaultValue: defaults.address2 ?? '',
          autoComplete: 'address-line2',
          className: 'md:col-span-2',
        })}
        {input(fields.phone, {
          label: t('form.phone'),
          name: 'phone',
          type: 'tel',
          defaultValue: defaults.phone ?? '',
          autoComplete: 'tel',
        })}
      </div>
      {!isDefault && (
        <label className="flex items-center gap-2">
          <Checkbox name="default" defaultChecked={makeDefault} />
          {t(`account.address.useAsDefault.${kind}`)}
        </label>
      )}
      <FormStatus errors={errors} fields={shown} />
      <div className="flex items-center gap-4">
        <Button type="submit" loading={busy}>
          {t('account.address.save')}
        </Button>
        <Link to="." className="text-muted underline">
          {t('account.address.cancel')}
        </Link>
      </div>
    </Form>
  );
}
