import {useLoaderData, Link, data} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import {Pagination} from '~/components/Pagination';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.blog ? `${d.blog.title} | Nitrogen` : 'Blog | Nitrogen',
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
      <h1 className="text-2xl font-bold tracking-tight mb-5">{blog.title}</h1>
      <Pagination connection={articles}>
        {({nodes, NextLink, isLoading}) => (
          <div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {nodes.map((article) => (
                <Link key={article.id} to={`/blogs/${blog.handle}/${article.handle}`} className="block text-inherit hover:no-underline" prefetch="intent">
                  {article.image && <Image data={article.image} alt={article.title} className="aspect-[3/2] object-cover w-full rounded-[10px] bg-gray-100" />}
                  <h3 className="text-base font-semibold mt-3">{article.title}</h3>
                  {article.excerpt && <p className="text-[0.85rem] text-gray-500 mt-1">{article.excerpt}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {article.authorV2 && <>By {article.authorV2.name} &middot; </>}{new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
            <NextLink className="flex items-center justify-center w-full py-3 px-6 my-6 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg no-underline transition-[background,color,border-color] duration-150 hover:bg-gray-100 hover:border-gray-400 hover:text-dark hover:no-underline">
              {isLoading ? 'Loading...' : 'Load more \u2193'}
            </NextLink>
          </div>
        )}
      </Pagination>
    </div>
  );
}
