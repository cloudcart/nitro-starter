import {data, useActionData, useOutletContext} from 'react-router';
import type {Route} from './+types/account.addresses.shipping';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import type {Customer} from '@cloudcart/nitrogen';
import {AddressListSection, readAddressFromForm} from '~/components/AddressForm';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Shipping addresses | Nitrogen'});

type ActionResponse = {error: string | null; message?: string};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  return null;
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  const form = await request.formData();
  const id = form.get('id')?.toString() ?? '';

  try {
    switch (request.method) {
      case 'POST': {
        const {errors} = await ctx.customerAccount.createAddress(readAddressFromForm(form));
        if (errors.length) return data({error: errors[0].message}, {status: 400});
        return {error: null, message: 'Address added.'} as ActionResponse;
      }
      case 'PUT': {
        if (!id) return data({error: 'Missing address id.'}, {status: 400});
        const {errors} = await ctx.customerAccount.updateAddress(id, readAddressFromForm(form));
        if (errors.length) return data({error: errors[0].message}, {status: 400});
        if (form.get('defaultAddress') === 'on') await ctx.customerAccount.setDefaultAddress(id);
        return {error: null, message: 'Address updated.'} as ActionResponse;
      }
      case 'DELETE': {
        if (!id) return data({error: 'Missing address id.'}, {status: 400});
        const {errors} = await ctx.customerAccount.deleteAddress(id);
        if (errors.length) return data({error: errors[0].message}, {status: 400});
        return {error: null, message: 'Address removed.'} as ActionResponse;
      }
      default:
        return data({error: 'Method not allowed.'}, {status: 405});
    }
  } catch (err: unknown) {
    return data({error: err instanceof Error ? err.message : 'Unknown error'}, {status: 400});
  }
}

export default function ShippingAddresses() {
  const {customer} = useOutletContext<{customer: Customer}>();
  const actionData = useActionData<ActionResponse>();

  return (
    <AddressListSection
      title="Shipping addresses"
      addresses={customer.addresses?.nodes ?? []}
      defaultAddressId={customer.defaultAddress?.id}
      actionData={actionData}
    />
  );
}
