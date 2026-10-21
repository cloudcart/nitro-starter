import {data, useLoaderData} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/contacts';
import {errorMeta, metaTranslator, pageMeta, storeName} from '~/lib/meta';
import {ContactForm} from '~/components/ContactForm';
import {buyerUserAgent, type FormError} from '~/components/FormFields';
import {PageContent} from '~/components/PageContent';
import {STORE_CONTACT_FRAGMENT, StoreContact} from '~/components/StoreContact';
import {FORM_USER_ERROR_FRAGMENT, POLICY_FRAGMENT} from '~/lib/fragments';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, payloadOf} from '~/lib/action';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) => {
  if (error) return errorMeta(matches);
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: t('contact.title'),
    path: '/contacts',
    description: t('seo.contact', {store: storeName(matches)}),
  });
};

/** /contacts — how to reach the store and its contact form, as on the CloudCart storefront. */
export async function loader({context}: Route.LoaderArgs) {
  const [{shop, policies}, isLoggedIn] = await Promise.all([
    context.storefront.query(CONTACT_PAGE_QUERY, {cache: context.storefront.CacheSettings()}),
    context.customerAccount.isLoggedIn(),
  ]);
  return {shop, policies, isLoggedIn};
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const {text, optional} = formFields(form);

  const contactFormSubmit = payloadOf(
    await context.storefront.mutate(CONTACT_FORM_MUTATION, {
      variables: {
        buyer: await context.customerAccount.getBuyer(),
        input: {
          firstName: optional('firstName'),
          lastName: optional('lastName'),
          email: optional('email'),
          phone: optional('phone'),
          subject: text('subject'),
          message: text('message'),
          acceptedPolicyIds: form.getAll('acceptedPolicyIds').map(String),
          buyerUserAgent: buyerUserAgent(request),
        },
      },
    }),
    'contactFormSubmit',
  );

  const errors: FormError[] = contactFormSubmit ? contactFormSubmit.userErrors : [API_ERROR];
  return data({ok: errors.length === 0, message: contactFormSubmit?.message, errors});
}

export default function Contacts() {
  const {t} = useTranslation();
  const {shop, policies, isLoggedIn} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-wide px-gutter py-10 md:px-gutter-md">
      <PageContent title={t('contact.title')}>
        {/* The store's contact beside the form on a desktop, above it on a phone. */}
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div className="self-start rounded-card bg-surface p-6">
            <StoreContact name={shop.name} contact={shop.contact} className="text-foreground" />
          </div>
          <section aria-labelledby="contact-form-title" className="flex flex-col gap-6">
            <h2 id="contact-form-title" className="text-heading">
              {t('contact.formTitle')}
            </h2>
            <ContactForm policies={policies} isLoggedIn={isLoggedIn} />
          </section>
        </div>
      </PageContent>
    </div>
  );
}

const CONTACT_PAGE_QUERY = `#graphql
  query ContactPage {
    shop {
      name
      contact {
        ...StoreContact
      }
    }
    policies(form: CONTACTS) {
      ...FormPolicy
    }
  }
  ${POLICY_FRAGMENT}
  ${STORE_CONTACT_FRAGMENT}
` as const;

const CONTACT_FORM_MUTATION = `#graphql
  mutation ContactFormSubmit($input: ContactFormInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    contactFormSubmit(input: $input) {
      message
      userErrors {
        ...FormUserErrorFields
      }
    }
  }
  ${FORM_USER_ERROR_FRAGMENT}
` as const;
