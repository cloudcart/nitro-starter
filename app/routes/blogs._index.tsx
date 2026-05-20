import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/blogs._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Nitrogen | Blog'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const blogs = await ctx.storefront.getBlogs();
  return {blogs};
}

export default function BlogsIndex() {
  const {blogs} = useLoaderData<typeof loader>();
  return <div><h1>Blog</h1>{blogs.map((b) => <Link key={b.id} to={`/blogs/${b.handle}`} style={{display:'block',margin:'0.5rem 0'}}>{b.title}</Link>)}</div>;
}
