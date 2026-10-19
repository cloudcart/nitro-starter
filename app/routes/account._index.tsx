import {data, Form, useActionData, useOutletContext} from 'react-router';
import type {Route} from './+types/account._index';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import type {AccountCustomerQuery} from 'storefrontapi.generated';
import {useTranslation} from '@cloudcart/nitrogen';
import {AccountSection} from '~/components/AccountSection';
import {CheckboxField, Field, type FormError, FormStatus} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import {AccountRouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, payloadOf, useSubmission} from '~/lib/action';
import {CUSTOMER_USER_ERROR_FRAGMENT} from '~/lib/fragments';

/** An error shows in the account's column, under its heading, translated (B-201, B-433). */
export const ErrorBoundary = AccountRouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('account.nav.profile'));

/** Saves the customer's name, e-mail, phone and marketing choice. */
export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const {text} = formFields(form);

  const customerUpdate = payloadOf(
    await context.customerAccount.mutate(CUSTOMER_UPDATE_MUTATION, {
      variables: {
        customer: {
          firstName: text('firstName'),
          lastName: text('lastName'),
          email: text('email'),
          phone: text('phone'),
          acceptsMarketing: form.get('acceptsMarketing') === 'on',
        },
      },
    }),
    'customerUpdate',
  );

  const errors: FormError[] = customerUpdate ? customerUpdate.customerUserErrors : [API_ERROR];
  return data({ok: errors.length === 0, errors});
}

/** /account — the customer's details. */
export default function Profile() {
  const {t} = useTranslation();
  const {customer} = useOutletContext<{customer: NonNullable<AccountCustomerQuery['customer']>}>();
  const result = useActionData<typeof action>();
  const busy = useSubmission() !== null;

  return (
    <AccountSection title={t('account.nav.profile')}>
      <Form method="post" className="flex max-w-column flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t('form.firstName')}
            name="firstName"
            defaultValue={customer.firstName ?? ''}
            autoComplete="given-name"
            errors={result?.errors}
          />
          <Field
            label={t('form.lastName')}
            name="lastName"
            defaultValue={customer.lastName ?? ''}
            autoComplete="family-name"
            errors={result?.errors}
          />
        </div>
        <Field
          label={t('form.email')}
          name="email"
          type="email"
          required
          defaultValue={customer.email ?? ''}
          autoComplete="email"
          errors={result?.errors}
        />
        <Field
          label={t('form.phone')}
          name="phone"
          type="tel"
          defaultValue={customer.phone ?? ''}
          autoComplete="tel"
          errors={result?.errors}
        />
        <CheckboxField name="acceptsMarketing" defaultChecked={customer.acceptsMarketing} label={t('form.marketing')} />
        <FormStatus
          message={result?.ok ? t('account.profile.saved') : undefined}
          errors={result?.errors}
          fields={['firstName', 'lastName', 'email', 'phone']}
        />
        <Button type="submit" loading={busy} className="self-start">
          {t('form.save')}
        </Button>
      </Form>
    </AccountSection>
  );
}

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation CustomerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      # The e-mail as saved: Nitrogen's customerAccount hashes it for the vendors when it changes.
      customer {
        email
      }
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;
