import {data, Form, Link, redirect, useActionData, useSearchParams} from 'react-router';
import type {Route} from './+types/auth.login';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import {localRedirectPath, useTranslation} from '@cloudcart/nitrogen';
import {Field, type FormError, FormStatus} from '~/components/FormFields';
import {Button} from '~/components/ui/Button';
import {useSubmission} from '~/lib/action';
import {RouteErrorBoundary} from '~/components/RouteError';
import {registerPath, signInPath} from '~/lib/urls';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('auth.signIn'));

/** Where to go after signing in: the page that asked for it, or the account. Only paths on this storefront. */
function returnTo(url: URL) {
  return localRedirectPath(url.searchParams.get('redirect')) ?? '/account';
}

export async function loader({context, url}: Route.LoaderArgs) {
  if (await context.customerAccount.isLoggedIn()) throw redirect(returnTo(url));
  return {};
}

/**
 * /auth/login — sign in with a code sent by e-mail: the visitor enters their
 * address, then the code from the message. CloudCart accounts have no
 * storefront password.
 */
export async function action({request, url, context}: Route.ActionArgs) {
  const {customerAccount} = context;
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const code = String(form.get('code') ?? '').trim();

  if (!code) {
    const {customerUserErrors} = await customerAccount.requestLoginCode(email);
    const errors: FormError[] = customerUserErrors;
    return data({step: errors.length ? 'email' : 'code', email, errors});
  }

  const {customerUserErrors} = await customerAccount.verifyLoginCode(email, code);
  if (customerUserErrors.length) {
    return data({step: 'code', email, errors: customerUserErrors as FormError[]});
  }

  // The session now holds the token; server.ts commits it with this response.
  throw redirect(returnTo(url));
}

export default function Login() {
  const {t} = useTranslation();
  // The page to come back to, kept through the links to registering and to another e-mail (B-455).
  const back = useSearchParams()[0].get('redirect');
  const result = useActionData<typeof action>();
  const busy = useSubmission() !== null;
  const step = result?.step ?? 'email';

  return (
    <div className="mx-auto flex max-w-narrow flex-col gap-8 px-gutter py-16 md:px-gutter-md">
      <h1 className="text-title">{t('auth.signIn')}</h1>
      {step === 'email' ? (
        <Form method="post" className="flex flex-col gap-4">
          <p className="text-muted">{t('auth.signInIntro')}</p>
          <Field
            label={t('form.email')}
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={result?.email}
            errors={result?.errors}
          />
          <FormStatus errors={result?.errors} fields={['email']} />
          <Button type="submit" loading={busy} fullWidth>
            {t('auth.sendCode')}
          </Button>
          <p className="text-small text-muted">
            {t('auth.newHere')}{' '}
            <Link to={registerPath(back)} className="font-medium inline-link">
              {t('auth.createAccount')}
            </Link>
          </p>
        </Form>
      ) : (
        <Form method="post" className="flex flex-col gap-4">
          <p className="text-muted">{t('auth.codeSent', {email: result?.email ?? ''})}</p>
          <input type="hidden" name="email" value={result?.email} />
          <Field
            label={t('form.code')}
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            errors={result?.errors}
          />
          <FormStatus errors={result?.errors} fields={['code']} />
          <Button type="submit" loading={busy} fullWidth>
            {t('auth.signIn')}
          </Button>
          <Link to={signInPath(back)} className="text-small text-muted underline">
            {t('auth.otherEmail')}
          </Link>
        </Form>
      )}
    </div>
  );
}
