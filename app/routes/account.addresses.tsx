import {Outlet, useOutletContext} from 'react-router';
import type {Customer} from '@cloudcart/nitrogen';

export default function AddressesLayout() {
  const context = useOutletContext<{customer: Customer}>();
  return <Outlet context={context} />;
}
