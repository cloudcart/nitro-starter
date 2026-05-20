import {Form, data, useActionData, useNavigation, useOutletContext} from 'react-router';
import type {Route} from './+types/account.profile';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import type {Customer} from '@cloudcart/nitrogen';
import {CheckIcon, XMarkIcon} from '@heroicons/react/24/outline';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Profile | Nitrogen'});

type ActionResponse = {error: string | null; saved: boolean};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  return null;
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed', saved: false}, {status: 405});
  }
  const ctx = await getContext(context, request);
  const form = await request.formData();

  const input = {
    firstName: (form.get('firstName') ?? '').toString().trim() || undefined,
    lastName: (form.get('lastName') ?? '').toString().trim() || undefined,
    phone: (form.get('phone') ?? '').toString().trim() || undefined,
    email: (form.get('email') ?? '').toString().trim() || undefined,
    acceptsMarketing: form.get('acceptsMarketing') === 'on',
  };

  const {errors} = await ctx.customerAccount.updateCustomer(input);
  if (errors.length) {
    return data({error: errors[0].message, saved: false}, {status: 400});
  }
  return {error: null, saved: true} as ActionResponse;
}

export default function AccountProfile() {
  const {customer} = useOutletContext<{customer: Customer}>();
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <section>
      <h2 className="text-lg font-bold mb-6">Profile</h2>

      {actionData?.error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <XMarkIcon className="size-4 shrink-0" />
          {actionData.error}
        </div>
      )}
      {actionData?.saved && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
          <CheckIcon className="size-4 shrink-0" />
          Profile saved successfully.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-900 text-white">
          <h3 className="text-xs font-medium uppercase tracking-wider">Personal information</h3>
        </div>
        <Form method="PUT" className="p-5 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1.5">First name</span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                defaultValue={customer.firstName ?? ''}
                className="form-input w-full py-2.5 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1.5">Last name</span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                defaultValue={customer.lastName ?? ''}
                className="form-input w-full py-2.5 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              defaultValue={customer.email ?? ''}
              className="form-input w-full py-2.5 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Phone</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              defaultValue={customer.phone ?? ''}
              className="form-input w-full py-2.5 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-500 select-none cursor-pointer">
            <input
              type="checkbox"
              name="acceptsMarketing"
              defaultChecked={customer.acceptsMarketing}
              className="rounded border-gray-300 text-brand focus:ring-brand/20"
            />
            Receive marketing emails
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Form>
      </div>
    </section>
  );
}
