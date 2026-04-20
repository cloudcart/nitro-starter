import {redirect} from 'react-router';
import type {Route} from './+types/account_.logout';
import {getContext} from '~/lib/context';

export async function loader() {
  return redirect('/');
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  await ctx.customerAccount.logout();
  throw redirect('/', {
    headers: {'Set-Cookie': await ctx.session.commit()},
  });
}
