import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/pages.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {RichText} from '@cloudcart/nitrogen-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.page ? d.page.title + ' | Nitrogen' : 'Page | Nitrogen'});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const page = await ctx.storefront.getPage(params.handle);
  if (!page) throw data('Page not found', {status: 404});
  return {page};
}

export default function PageRoute() {
  const {page} = useLoaderData<typeof loader>();
  return <div><h1>{page.title}</h1><RichText data={page.body} /></div>;
}
