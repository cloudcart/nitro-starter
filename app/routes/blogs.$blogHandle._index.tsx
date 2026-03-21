import {useLoaderData, Link, data} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.blog ? `${d.blog.title} | Nitro` : 'Blog | Nitro'});

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
      <h1 className="section-heading">{blog.title}</h1>
      <div className="blog-grid">
        {articles.map((article) => (
          <Link key={article.id} to={`/blogs/${blog.handle}/${article.handle}`} className="blog-card" prefetch="intent">
            <Image data={article.image} alt={article.title} />
            <h3>{article.title}</h3>
            <p className="excerpt">{article.excerpt}</p>
            <p className="meta">By {article.author.name} &middot; {new Date(article.publishedAt).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
