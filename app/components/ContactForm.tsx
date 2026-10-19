import {useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {FormPolicyFragment} from 'storefrontapi.generated';
import {Field, FormStatus, PolicyCheckboxes, TextArea} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import type {action} from '~/routes/contacts';

/** The inputs that show their own errors (B-424). */
const CONTACT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'subject', 'message', 'acceptedPolicyIds'];

/**
 * The store's contact form, sent to `/contacts` from any page. A signed-in customer is not asked who they are: the
 * store takes their name, e-mail and phone from their account. Once sent, the store's own message replaces it;
 * a refusal shows under its field.
 */
export function ContactForm({policies, isLoggedIn}: {policies: FormPolicyFragment[]; isLoggedIn: boolean}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<typeof action>({key: 'contact-form'});
  const result = fetcher.data;

  if (result?.ok) return <FormStatus message={result.message ?? t('contact.sent')} />;

  return (
    <fetcher.Form method="post" action="/contacts" className="flex flex-col gap-4">
      {!isLoggedIn && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t('form.firstName')}
              name="firstName"
              required
              errors={result?.errors}
              autoComplete="given-name"
            />
            <Field
              label={t('form.lastName')}
              name="lastName"
              required
              errors={result?.errors}
              autoComplete="family-name"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t('form.email')}
              name="email"
              type="email"
              required
              errors={result?.errors}
              autoComplete="email"
            />
            <Field
              label={t('form.phone')}
              name="phone"
              type="tel"
              required
              errors={result?.errors}
              autoComplete="tel"
            />
          </div>
        </>
      )}
      <Field label={t('contact.subject')} name="subject" required errors={result?.errors} />
      <TextArea label={t('contact.message')} name="message" required rows={6} errors={result?.errors} />
      <PolicyCheckboxes policies={policies} form="CONTACTS" errors={result?.errors} />
      <FormStatus errors={result?.errors} fields={CONTACT_FIELDS} />
      <Button type="submit" loading={fetcher.state !== 'idle'} className="self-start">
        {t('contact.send')}
      </Button>
    </fetcher.Form>
  );
}
