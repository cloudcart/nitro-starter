import {useLoaderData, Link, data} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Pagination, Image} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.blog ? `${d.blog.title} | Nitro` : 'Blog | Nitro',
});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const blog = await ctx.storefront.getBlog(params.blogHandle);
  if (!blog) throw data('Blog not found', {status: 404});
  const paginationVariables = getPaginationVariables(request, {pageBy: 6});
  const articles = await ctx.storefront.getArticlesPaginated(params.blogHandle, paginationVariables);
  return {blog, articles};
}

export default function BlogPage() {
  const {blog, articles} = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="section-heading">{blog.title}</h1>
      <Pagination connection={articles}>
        {({nodes, NextLink, isLoading}) => (
          <div>
            <div className="blog-grid">
              {nodes.map((article) => (
                <Link key={article.id} to={`/blogs/${blog.handle}/${article.handle}`} className="blog-card" prefetch="intent">
                  {article.image && <Image data={article.image} alt={article.title} />}
                  <h3>{article.title}</h3>
                  {article.excerpt && <p className="excerpt">{article.excerpt}</p>}
                  <p className="meta">
                    By {article.author.name} &middot; {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
            <NextLink className="pagination-link pagination-next">
              {isLoading ? 'Loading...' : 'Load more ↓'}
            </NextLink>
          </div>
        )}
      </Pagination>
    </div>
  );
}
