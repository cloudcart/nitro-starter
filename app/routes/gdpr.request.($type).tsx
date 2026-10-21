import {data, useFetcher, useLoaderData} from 'react-router';
import type {Route} from './+types/gdpr.request.($type)';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import {useTranslation} from '@cloudcart/nitrogen';
import {Field, type FormError, FormStatus, RadioField, TextArea} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import {GDPR_REQUEST_TYPES, GDPR_REQUEST_TYPES_QUERY} from '~/lib/gdpr';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, payloadOf} from '~/lib/action';
import {FORM_USER_ERROR_FRAGMENT} from '~/lib/fragments';
import {ifSignedIn} from '~/lib/customer';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('gdpr.request.title'));

/**
 * /gdpr/request/{type} — a GDPR request to the store (a question about the
 * visitor's data, a copy, its deletion, an end to marketing), as on the
 * CloudCart storefront. A store without the GDPR app takes none: 404.
 */
export async function loader({context, params}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;

  const [{shop}, customer] = await Promise.all([
    storefront.query(GDPR_REQUEST_TYPES_QUERY, {cache: storefront.CacheSettings()}),
    // A signed-in customer's name and e-mail fill the form in; a token the API turned down just means a guest.
    ifSignedIn(customerAccount, () => customerAccount.query(GDPR_REQUEST_CUSTOMER_QUERY)).then(
      (result) => result?.customer ?? null,
    ),
  ]);

  const types = GDPR_REQUEST_TYPES.filter((entry) => shop.gdprRequestTypes.includes(entry.type));
  if (!types.length) throw new Response('Not found', {status: 404});

  // As on the platform, an unknown type falls back to the first.
  const selected = types.find((entry) => entry.slug === params.type) ?? types[0]!;

  return {types, selected: selected.type, customer};
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const {text} = formFields(form);

  const gdprRequestCreate = payloadOf(
    await context.storefront.mutate(GDPR_REQUEST_CREATE_MUTATION, {
      variables: {
        buyer: await context.customerAccount.getBuyer(),
        input: {
          type: GDPR_REQUEST_TYPES.find((entry) => entry.type === text('type'))?.type ?? 'INFO',
          email: text('email'),
          name: text('name'),
          message: text('message'),
        },
      },
    }),
    'gdprRequestCreate',
  );

  const errors: FormError[] = gdprRequestCreate ? gdprRequestCreate.userErrors : [API_ERROR];
  return data({ok: errors.length === 0, message: gdprRequestCreate?.message, errors});
}

export default function GdprRequest() {
  const {t} = useTranslation();
  const {types, selected, customer} = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;

  return (
    <div className="mx-auto flex max-w-form-page flex-col gap-8 px-gutter py-10 md:px-gutter-md">
      <div className="flex flex-col gap-2">
        <h1 className="text-title">{t('gdpr.request.title')}</h1>
        <p className="text-muted">{t('gdpr.request.intro')}</p>
      </div>
      {result?.ok ? (
        <FormStatus message={result.message ?? t('gdpr.request.sent')} />
      ) : (
        <fetcher.Form method="post" className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">{t('gdpr.request.what')}</legend>
            {types.map((entry) => (
              <RadioField
                key={entry.type}
                name="type"
                value={entry.type}
                defaultChecked={entry.type === selected}
                label={t(`gdpr.requestType.${entry.type}`)}
              />
            ))}
          </fieldset>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t('form.name')}
              name="name"
              required
              maxLength={191}
              defaultValue={customer?.displayName ?? ''}
              errors={result?.errors}
              autoComplete="name"
            />
            <Field
              label={t('form.email')}
              name="email"
              type="email"
              required
              maxLength={191}
              defaultValue={customer?.email ?? ''}
              errors={result?.errors}
              autoComplete="email"
            />
          </div>
          <TextArea label={t('gdpr.request.message')} name="message" maxLength={191} rows={4} errors={result?.errors} />
          <FormStatus errors={result?.errors} fields={['name', 'email', 'message']} />
          <Button type="submit" loading={fetcher.state !== 'idle'} className="self-start">
            {t('gdpr.request.send')}
          </Button>
        </fetcher.Form>
      )}
    </div>
  );
}

const GDPR_REQUEST_CUSTOMER_QUERY = `#graphql
  query GdprRequestCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      displayName
      email
    }
  }
` as const;

const GDPR_REQUEST_CREATE_MUTATION = `#graphql
  mutation GdprRequestCreate($input: GdprRequestCreateInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    gdprRequestCreate(input: $input) {
      message
      userErrors {
        ...FormUserErrorFields
      }
    }
  }
  ${FORM_USER_ERROR_FRAGMENT}
` as const;
