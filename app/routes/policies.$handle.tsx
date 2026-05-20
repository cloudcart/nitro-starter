import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/policies.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {RichText} from '@cloudcart/nitrogen-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.policy ? d.policy.title + ' | Nitrogen' : 'Policy | Nitrogen'});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const policy = await ctx.storefront.getPolicy(params.handle);
  if (!policy) throw data('Policy not found', {status: 404});
  return {policy};
}

export default function PolicyPage() {
  const {policy} = useLoaderData<typeof loader>();
  return <div><h1>{policy.title}</h1><RichText data={policy.body} /></div>;
}
