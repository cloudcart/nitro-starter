import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {Image, RichText} from '@cloudcart/nitrogen-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.article ? d.article.title + ' | Nitrogen' : 'Article | Nitrogen'});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const article = await ctx.storefront.getArticle(params.blogHandle, params.articleHandle);
  if (!article) throw data('Article not found', {status: 404});
  return {article};
}

export default function ArticlePage() {
  const {article} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>{article.title}</h1>
      <p>{article.authorV2 && <>By {article.authorV2.name} · </>}{new Date(article.publishedAt).toLocaleDateString()}</p>
      {article.image && <Image data={article.image} alt={article.title} />}
      <RichText data={article.contentHtml} />
    </div>
  );
}
