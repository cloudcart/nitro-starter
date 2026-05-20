import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitrogen | Policies'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const policies = await ctx.storefront.getPolicies();
  return {policies};
}

export default function PoliciesIndex() {
  const {policies} = useLoaderData<typeof loader>();
  return <div><h1>Policies</h1><ul>{policies.map((p) => <li key={p.id}><Link to={`/policies/${p.handle}`}>{p.title}</Link></li>)}</ul></div>;
}
