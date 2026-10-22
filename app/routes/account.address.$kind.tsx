import {data, Form, Link, redirect, useActionData, useLoaderData, useSearchParams} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/account.address.$kind';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import type {MailingAddressInput} from '@cloudcart/nitrogen/storefront-api-types';
import {AccountSection} from '~/components/AccountSection';
import {ADDRESS_CARD_FRAGMENT, AddressCard} from '~/components/AddressCard';
import {AddressForm} from '~/components/AddressForm';
import {type FormError, FormStatus} from '~/components/FormFields';
import {ButtonLink} from '~/components/ui/Button';
import {AccountRouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, payloadOf, useSubmission} from '~/lib/action';
import {CUSTOMER_USER_ERROR_FRAGMENT} from '~/lib/fragments';
import {missingResource} from '~/lib/missing';

/** An error shows in the account's column, under its heading, translated (B-201, B-433). */
export const ErrorBoundary = AccountRouteErrorBoundary;

const KINDS = {
  shipping: {
    heading: 'account.nav.shippingAddresses',
    add: 'account.address.add.shipping',
    none: 'account.address.none.shipping',
  },
  billing: {
    heading: 'account.nav.billingAddresses',
    add: 'account.address.add.billing',
    none: 'account.address.none.billing',
  },
} as const;
type Kind = keyof typeof KINDS;

function kindOf(param: string | undefined): Kind {
  if (param !== 'shipping' && param !== 'billing') throw new Response('Not found', {status: 404});
  return param;
}

export const meta: Route.MetaFunction = ({params, error, matches}) => {
  if (error) return errorMeta(matches);
  const texts = KINDS[params.kind as Kind] as (typeof KINDS)[Kind] | undefined;
  return texts ? privateMeta(metaTranslator(matches)(texts.heading)) : [];
};

/**
 * /account/address/shipping and /account/address/billing — the customer's
 * saved addresses. Which fields the form asks for, and which are mandatory,
 * is the store's checkout setting, so the addresses saved here are the ones
 * the checkout accepts. The country is chosen from the countries the store
 * sells to (`localization.availableCountries`) and sent as its code.
 */
export async function loader({params, context}: Route.LoaderArgs) {
  const kind = kindOf(params.kind);
  const [{customer, errors}, {checkoutSettings, localization}] = await Promise.all([
    context.customerAccount.query(ADDRESSES_QUERY, {variables: {shipping: kind === 'shipping'}}),
    context.storefront.query(ADDRESS_FORM_QUERY, {cache: context.storefront.CacheSettings()}),
  ]);
  if (!customer) throw missingResource(errors, 'Not found');

  const list = kind === 'shipping' ? customer.addresses : customer.billingAddresses;
  const fallback = kind === 'shipping' ? customer.defaultAddress : customer.defaultBillingAddress;

  return {
    kind,
    addresses: list?.nodes ?? [],
    defaultId: fallback?.id ?? null,
    fields: checkoutSettings.fields,
    countries: localization.availableCountries,
    // A new address starts in the store's own country when the store sells there.
    country: localization.availableCountries.some((entry) => entry.isoCode === localization.country.isoCode)
      ? localization.country.isoCode
      : '',
  };
}

export async function action({request, params, context}: Route.ActionArgs) {
  const kind = kindOf(params.kind);
  const {customerAccount} = context;
  const form = await request.formData();
  const intent = String(form.get('intent'));
  const id = String(form.get('id') ?? '');
  const shipping = kind === 'shipping';
  let errors: FormError[];

  switch (intent) {
    case 'create': {
      const address = addressInput(form);
      const result = shipping
        ? payloadOf(
            await customerAccount.mutate(ADDRESS_CREATE_MUTATION, {variables: {address}}),
            'customerAddressCreate',
          )
        : payloadOf(
            await customerAccount.mutate(BILLING_ADDRESS_CREATE_MUTATION, {variables: {address}}),
            'customerBillingAddressCreate',
          );
      errors = result ? result.customerUserErrors : [API_ERROR];
      if (!errors.length && result?.customerAddress && form.get('default') === 'on') {
        errors = await makeDefault(kind, result.customerAddress.id, customerAccount);
      }
      break;
    }
    case 'update': {
      const address = addressInput(form);
      const result = shipping
        ? payloadOf(
            await customerAccount.mutate(ADDRESS_UPDATE_MUTATION, {variables: {id, address}}),
            'customerAddressUpdate',
          )
        : payloadOf(
            await customerAccount.mutate(BILLING_ADDRESS_UPDATE_MUTATION, {variables: {id, address}}),
            'customerBillingAddressUpdate',
          );
      errors = result ? result.customerUserErrors : [API_ERROR];
      if (!errors.length && form.get('default') === 'on') errors = await makeDefault(kind, id, customerAccount);
      break;
    }
    case 'delete': {
      const result = shipping
        ? payloadOf(await customerAccount.mutate(ADDRESS_DELETE_MUTATION, {variables: {id}}), 'customerAddressDelete')
        : payloadOf(
            await customerAccount.mutate(BILLING_ADDRESS_DELETE_MUTATION, {variables: {id}}),
            'customerBillingAddressDelete',
          );
      errors = result ? result.customerUserErrors : [API_ERROR];
      break;
    }
    case 'default':
      errors = await makeDefault(kind, id, customerAccount);
      break;
    default:
      throw new Response('Unknown action', {status: 400});
  }

  if (errors.length) return data({errors}, {status: 400});
  // As the platform's storefront does after an address is added or edited (not removed or made the default): its
  // request for CloudCart Analytics is kept for the next page, so it is awaited before the answer.
  if (intent === 'create' || intent === 'update') await customerAccount.identifyVisitor();
  return redirect(`/account/address/${kind}`);
}

async function makeDefault(
  kind: Kind,
  addressId: string,
  customerAccount: Route.ActionArgs['context']['customerAccount'],
): Promise<FormError[]> {
  if (kind === 'shipping') {
    const made = payloadOf(
      await customerAccount.mutate(DEFAULT_ADDRESS_MUTATION, {variables: {addressId}}),
      'customerDefaultAddressUpdate',
    );
    return made ? made.customerUserErrors : [API_ERROR];
  }
  const made = payloadOf(
    await customerAccount.mutate(DEFAULT_BILLING_ADDRESS_MUTATION, {variables: {addressId}}),
    'customerDefaultBillingAddressUpdate',
  );
  return made ? made.customerUserErrors : [API_ERROR];
}

/**
 * The form's inputs as the API takes them. Every field the form shows is sent, a blank one as empty,
 * which clears it on an edit; a field the store hides is not in the form and is left as it is.
 */
function addressInput(form: FormData): MailingAddressInput {
  const keys = [
    'firstName',
    'lastName',
    'company',
    'companyVat',
    'companyBulstat',
    'companyMol',
    'countryCode',
    'province',
    'city',
    'zip',
    'address1',
    'streetNumber',
    'address2',
    'phone',
  ] as const;
  return Object.fromEntries(
    keys.filter((key) => form.has(key)).map((key) => [key, String(form.get(key)).trim()]),
  ) as MailingAddressInput;
}

export default function Addresses() {
  const {t} = useTranslation();
  const {kind, addresses, defaultId, fields, countries, country} = useLoaderData<typeof loader>();
  const errors = useActionData<typeof action>()?.errors;
  const [params] = useSearchParams();
  const editing = params.get('edit');
  const adding = params.has('new');
  const texts = KINDS[kind];
  // Every form names its action: left to the current URL, `?new` renders as `?new=` on the server and
  // `?new` in the browser, and the page fails to hydrate cleanly.
  const listPath = `/account/address/${kind}`;
  // An address's "default" or "delete" on its way, for the pressed button's loader.
  const sending = useSubmission(listPath);
  const sent = (id: string, intent: string) => sending?.get('id') === id && sending.get('intent') === intent;

  return (
    <AccountSection
      title={t(texts.heading)}
      action={
        !adding && (
          <ButtonLink to="?new" variant="secondary">
            {t(texts.add)}
          </ButtonLink>
        )
      }
    >
      {/* The first address is offered as the default. */}
      {adding && (
        <AddressForm
          kind={kind}
          fields={fields}
          countries={countries}
          defaults={{countryCodeV2: country}}
          makeDefault={!addresses.length}
          action={`${listPath}?new`}
          errors={errors}
        />
      )}

      {/* A refused "default" or "delete": no form is open to show it (B-424). */}
      {!adding && !editing && <FormStatus errors={errors} fields={[]} />}
      {addresses.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) =>
            editing === address.id ? (
              <li key={address.id} className="md:col-span-2">
                <AddressForm
                  kind={kind}
                  fields={fields}
                  countries={countries}
                  defaults={address}
                  isDefault={address.id === defaultId}
                  action={`${listPath}?edit=${encodeURIComponent(address.id)}`}
                  errors={errors}
                />
              </li>
            ) : (
              <li key={address.id}>
                <AddressCard address={address} isDefault={address.id === defaultId}>
                  <Link to={`?edit=${encodeURIComponent(address.id)}`} className="font-medium underline">
                    {t('account.address.edit')}
                  </Link>
                  {/* The default address cannot be deleted: another one is made the default first. */}
                  {address.id !== defaultId && (
                    <>
                      <Form method="post" action={listPath}>
                        <input type="hidden" name="id" value={address.id} />
                        <button
                          type="submit"
                          name="intent"
                          value="default"
                          aria-busy={sent(address.id, 'default') || undefined}
                          onClick={sending ? (event) => event.preventDefault() : undefined}
                          className="busy inline-flex items-center gap-1.5 font-medium underline"
                        >
                          {t('account.address.makeDefault')}
                        </button>
                      </Form>
                      <Form method="post" action={listPath}>
                        <input type="hidden" name="id" value={address.id} />
                        <button
                          type="submit"
                          name="intent"
                          value="delete"
                          aria-busy={sent(address.id, 'delete') || undefined}
                          onClick={sending ? (event) => event.preventDefault() : undefined}
                          className="busy inline-flex items-center gap-1.5 font-medium text-error underline"
                        >
                          {t('account.address.delete')}
                        </button>
                      </Form>
                    </>
                  )}
                </AddressCard>
              </li>
            ),
          )}
        </ul>
      ) : (
        !adding && <p className="text-muted">{t(texts.none)}</p>
      )}
    </AccountSection>
  );
}

const ADDRESS_FRAGMENT = `#graphql
  fragment AccountAddress on MailingAddress {
    ...AddressCard
    id
    companyMol
    streetName
    streetNumber
    countryCodeV2
  }
  ${ADDRESS_CARD_FRAGMENT}
` as const;

// The API ignores `after` on these lists (BUGS 8), so one page of the maximum size is read. The page's own kind only:
// the delivery addresses (`$shipping`) or the billing ones (B-441).
const ADDRESSES_QUERY = `#graphql
  query AccountAddresses($customerAccessToken: String!, $shipping: Boolean!) {
    customer(customerAccessToken: $customerAccessToken) {
      defaultAddress @include(if: $shipping) {
        id
      }
      addresses(first: 100) @include(if: $shipping) {
        nodes {
          ...AccountAddress
        }
      }
      defaultBillingAddress @skip(if: $shipping) {
        id
      }
      billingAddresses(first: 100) @skip(if: $shipping) {
        nodes {
          ...AccountAddress
        }
      }
    }
  }
  ${ADDRESS_FRAGMENT}
` as const;

const ADDRESS_FORM_QUERY = `#graphql
  fragment AccountAddressFields on CheckoutFieldSettings {
    firstName
    lastName
    phone
    state
    streetName
    streetNumber
    additionalInformation
    postCode
    companyName
    companyVat
    companyBulstat
    companyMol
  }
  query AccountAddressForm {
    checkoutSettings {
      fields {
        ...AccountAddressFields
      }
    }
    localization {
      availableCountries {
        isoCode
        name
      }
      country {
        isoCode
      }
    }
  }
` as const;

const ADDRESS_CREATE_MUTATION = `#graphql
  mutation AccountAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
    customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
      customerAddress {
        id
      }
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const ADDRESS_UPDATE_MUTATION = `#graphql
  mutation AccountAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
    customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const ADDRESS_DELETE_MUTATION = `#graphql
  mutation AccountAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const DEFAULT_ADDRESS_MUTATION = `#graphql
  mutation AccountDefaultAddress($customerAccessToken: String!, $addressId: ID!) {
    customerDefaultAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const BILLING_ADDRESS_CREATE_MUTATION = `#graphql
  mutation AccountBillingAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
    customerBillingAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
      customerAddress {
        id
      }
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const BILLING_ADDRESS_UPDATE_MUTATION = `#graphql
  mutation AccountBillingAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
    customerBillingAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const BILLING_ADDRESS_DELETE_MUTATION = `#graphql
  mutation AccountBillingAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerBillingAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const DEFAULT_BILLING_ADDRESS_MUTATION = `#graphql
  mutation AccountDefaultBillingAddress($customerAccessToken: String!, $addressId: ID!) {
    customerDefaultBillingAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;
