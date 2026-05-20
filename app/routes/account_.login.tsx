import {Form, Link, redirect, useActionData, useNavigation, useSearchParams} from 'react-router';
import type {Route} from './+types/account_.login';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Sign in | Nitrogen'});

type ActionData =
  | {stage: 'email'; error?: string}
  | {stage: 'code'; email: string; error?: string};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  if (ctx.customerAccount.isLoggedIn()) {
    throw redirect('/account');
  }
  return null;
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  const form = await request.formData();
  const stage = String(form.get('stage') ?? 'email');

  if (stage === 'email') {
    const email = String(form.get('email') ?? '').trim();
    if (!email) {
      return {stage: 'email', error: 'Please enter your email.'} as ActionData;
    }
    await ctx.customerAccount.requestLoginCode(email);
    throw redirect(`/account/login?sent=1&email=${encodeURIComponent(email)}`);
  }

  if (stage === 'code') {
    const email = String(form.get('email') ?? '').trim();
    const code = String(form.get('code') ?? '').trim();
    if (!email || !/^\d{6}$/.test(code)) {
      return {stage: 'code', email, error: 'Enter the 6-digit code.'} as ActionData;
    }
    const {errors} = await ctx.customerAccount.verifyLoginCode(email, code);
    if (errors.length) {
      return {stage: 'code', email, error: errors[0].message} as ActionData;
    }
    throw redirect('/account', {
      headers: {'Set-Cookie': await ctx.session.commit()},
    });
  }

  return {stage: 'email', error: 'Invalid request.'} as ActionData;
}

export default function AccountLogin() {
  const [params] = useSearchParams();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const sent = params.get('sent') === '1' || actionData?.stage === 'code';
  const email = actionData?.stage === 'code' ? actionData.email : (params.get('email') ?? '');

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">
        We’ll email you a 6-digit code. No password required.
      </p>

      {!sent ? (
        <Form method="POST" className="space-y-4">
          <input type="hidden" name="stage" value="email" />
          <label className="block">
            <span className="block text-sm font-medium mb-1">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
              className="form-input w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {actionData?.stage === 'email' && actionData.error ? (
            <p className="text-sm text-red-600">{actionData.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-brand text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Sending…' : 'Send sign-in code'}
          </button>
        </Form>
      ) : (
        <Form method="POST" className="space-y-4">
          <input type="hidden" name="stage" value="code" />
          <input type="hidden" name="email" value={email} />
          <p className="text-sm text-gray-600">
            We’ve sent a 6-digit code to <strong className="text-dark">{email}</strong>.
            Enter it below to sign in.
          </p>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Sign-in code</span>
            <input
              type="text"
              name="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
              className="form-input w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg tracking-[0.4em] text-center text-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {actionData?.stage === 'code' && actionData.error ? (
            <p className="text-sm text-red-600">{actionData.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-brand text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Didn’t get the code?{' '}
            <Link to="/account/login" className="text-brand hover:underline">
              Try again
            </Link>
          </p>
        </Form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        No account yet?{' '}
        <Link to="/account/register" className="text-brand hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
