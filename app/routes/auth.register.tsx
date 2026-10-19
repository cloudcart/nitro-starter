import {data, Form, Link, redirect, useActionData, useLoaderData, useSearchParams} from 'react-router';
import type {Route} from './+types/auth.register';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import {useTranslation} from '@cloudcart/nitrogen';
import {
  buyerUserAgent,
  CheckboxField,
  Field,
  type FormError,
  FormStatus,
  PolicyCheckboxes,
} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import {CUSTOMER_USER_ERROR_FRAGMENT, POLICY_FRAGMENT} from '~/lib/fragments';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, payloadOf, useSubmission} from '~/lib/action';
import {signInPath} from '~/lib/urls';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('auth.registerTitle'));

export async function loader({context}: Route.LoaderArgs) {
  if (await context.customerAccount.isLoggedIn()) throw redirect('/account');

  // The policies the merchant asks new customers to accept (GDPR app).
  const {policies} = await context.storefront.query(REGISTER_POLICIES_QUERY, {
    cache: context.storefront.CacheSettings(),
  });
  return {policies};
}

/** /auth/register — create an account, then sign in with the code that is e-mailed. */
export async function action({request, context}: Route.ActionArgs) {
  const {storefront, customerAccount} = context;
  const form = await request.formData();
  const {text, optional} = formFields(form);
  const email = text('email');

  const customerCreate = payloadOf(
    await storefront.mutate(CUSTOMER_CREATE_MUTATION, {
      variables: {
        input: {
          email,
          firstName: optional('firstName'),
          lastName: optional('lastName'),
          phone: optional('phone'),
          acceptsMarketing: form.get('acceptsMarketing') === 'on',
          acceptedPolicyIds: form.getAll('acceptedPolicyIds').map(String),
          buyerUserAgent: buyerUserAgent(request),
        },
      },
    }),
    'customerCreate',
  );

  const errors: FormError[] = customerCreate ? customerCreate.customerUserErrors : [API_ERROR];
  if (errors.length) return data({errors, created: false, email});

  // The new account signs in like any other: with a code sent to its e-mail.
  const {customerUserErrors} = await customerAccount.requestLoginCode(email);
  return data({errors: customerUserErrors as FormError[], created: true, email});
}

export default function Register() {
  const {t} = useTranslation();
  // The sign-in's way back (B-455): signing in from here returns there too.
  const back = useSearchParams()[0].get('redirect');
  const {policies} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  // The first form asks for a sign-in code (`/auth/login`), the second registers here.
  const askingCode = useSubmission('/auth/login') !== null;
  const registering = useSubmission() !== null;

  if (result?.created) {
    return (
      <div className="mx-auto flex max-w-narrow flex-col gap-8 px-gutter py-16 md:px-gutter-md">
        <div className="flex flex-col gap-4">
          <h1 className="text-title">{t('auth.checkEmail')}</h1>
          <p className="text-muted">{t('auth.accountReady', {email: result.email})}</p>
        </div>
        {/* The account is made; the sign-in code's sending may still have been refused (B-424). */}
        <FormStatus errors={result.errors} fields={[]} />
        <Form method="post" action={signInPath(back)} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={result.email} />
          <Field label={t('form.code')} name="code" required inputMode="numeric" autoComplete="one-time-code" />
          <Button type="submit" loading={askingCode} fullWidth>
            {t('auth.signIn')}
          </Button>
        </Form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-narrow flex-col gap-8 px-gutter py-16 md:px-gutter-md">
      <h1 className="text-title">{t('auth.registerTitle')}</h1>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('form.firstName')} name="firstName" autoComplete="given-name" errors={result?.errors} />
          <Field label={t('form.lastName')} name="lastName" autoComplete="family-name" errors={result?.errors} />
        </div>
        <Field
          label={t('form.email')}
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={result?.email}
          errors={result?.errors}
        />
        <Field label={t('form.phone')} name="phone" type="tel" autoComplete="tel" errors={result?.errors} />
        <CheckboxField name="acceptsMarketing" label={t('form.marketing')} />
        <PolicyCheckboxes policies={policies} form="REGISTER" errors={result?.errors} />
        <FormStatus errors={result?.errors} fields={['firstName', 'lastName', 'email', 'phone', 'acceptedPolicyIds']} />
        <Button type="submit" loading={registering} fullWidth>
          {t('auth.register')}
        </Button>
        <p className="text-small text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to={signInPath(back)} className="font-medium inline-link">
            {t('auth.signIn')}
          </Link>
        </p>
      </Form>
    </div>
  );
}

const REGISTER_POLICIES_QUERY = `#graphql
  query RegisterPolicies {
    policies(form: REGISTER) {
      ...FormPolicy
    }
  }
  ${POLICY_FRAGMENT}
` as const;

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation CustomerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;
