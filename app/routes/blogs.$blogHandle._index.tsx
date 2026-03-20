import {useLoaderData, Link, data} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.blog ? d.blog.title + ' | Nitro' : 'Blog | Nitro'});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const blog = await ctx.storefront.getBlog(params.blogHandle);
  if (!blog) throw data('Blog not found', {status: 404});
  const articles = await ctx.storefront.getArticles(params.blogHandle);
  return {blog, articles};
}

export default function BlogPage() {
  const {blog, articles} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>{blog.title}</h1>
      {articles.map((a) => (
        <Link key={a.id} to={`/blogs/${blog.handle}/${a.handle}`} style={{display:'block',margin:'1rem 0',textDecoration:'none',color:'inherit'}}>
          <Image data={a.image} alt={a.title} />
          <h3>{a.title}</h3>
          <p>{a.excerpt}</p>
        </Link>
      ))}
    </div>
  );
}
