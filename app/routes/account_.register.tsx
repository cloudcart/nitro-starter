import {Form, Link, redirect, useActionData, useNavigation} from 'react-router';
import type {Route} from './+types/account_.register';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Create account | Nitrogen'});

type ActionData = {error: string; values?: Record<string, string>};

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
  const email = String(form.get('email') ?? '').trim();
  const firstName = String(form.get('firstName') ?? '').trim();
  const lastName = String(form.get('lastName') ?? '').trim();
  const acceptsMarketing = form.get('acceptsMarketing') === 'on';

  if (!email) {
    return {error: 'Email is required.', values: {firstName, lastName}} as ActionData;
  }

  const {errors} = await ctx.customerAccount.register({
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    acceptsMarketing,
  });

  if (errors.length) {
    return {
      error: errors[0].message,
      values: {email, firstName, lastName},
    } as ActionData;
  }

  throw redirect(`/account/login?sent=1&email=${encodeURIComponent(email)}`);
}

export default function AccountRegister() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const v = actionData?.values ?? {};

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Create your account</h1>
      <p className="text-sm text-gray-500 mb-6">
        After registering, we’ll email you a 6-digit sign-in code.
      </p>

      <Form method="POST" className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            defaultValue={v.email ?? ''}
            className="form-input w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-medium mb-1">First name</span>
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              defaultValue={v.firstName ?? ''}
              className="form-input w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Last name</span>
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              defaultValue={v.lastName ?? ''}
              className="form-input w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" name="acceptsMarketing" className="mt-0.5" />
          <span>I’d like to receive marketing emails.</span>
        </label>

        {actionData?.error ? (
          <p className="text-sm text-red-600">{actionData.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-brand text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/account/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
