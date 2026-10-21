import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/blog.tag.$handle';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import {articleTagPath} from '~/lib/urls';
import {ArticleList} from '~/components/ArticleItem';
import {ListingHeader} from '~/components/ListingHeader';
import {ARTICLE_ITEM_FRAGMENT, blogCrumbs} from '~/lib/blog';
import {missingResource} from '~/lib/missing';
import {ButtonLink} from '~/components/ui/Button';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

// A page that throws is titled by the root's `meta`.
export const meta: Route.MetaFunction = ({data, location, matches}) => {
  if (!data) return [];
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: t('seo.articleTagTitle', {tag: data.tag.title}),
    // The API's handle, not the address's: one canonical however the address writes it (B-316).
    path: articleTagPath(data.tag.handle),
    search: location.search,
    description: t('seo.articleTag', {tag: data.tag.title, store: storeName(matches)}),
    crumbs: blogCrumbs(t, {title: data.tag.title}),
  });
};

/** /blog/tag/{handle} — the articles with a tag. */
export async function loader({context, params, request}: Route.LoaderArgs) {
  const {articleTag: tag, errors} = await context.storefront.query(ARTICLE_TAG_QUERY, {
    variables: {handle: params.handle, ...getPaginationVariables(request, {pageBy: 12})},
    cache: context.storefront.CacheShort(),
  });

  if (!tag) throw missingResource(errors, `Tag ${params.handle} not found`);

  return {tag};
}

export default function BlogTag() {
  const {t} = useTranslation();
  const {tag} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader crumbs={blogCrumbs(t, {title: tag.title})} title={`#${tag.title}`} />
      <ArticleList
        articles={tag.articles}
        emptyAction={
          <ButtonLink to="/blog" prefetch="intent" variant="secondary">
            {t('blog.allArticles')}
          </ButtonLink>
        }
      />
    </div>
  );
}

const ARTICLE_TAG_QUERY = `#graphql
  query ArticleTag($handle: String!, $first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    articleTag(handle: $handle) {
      title
      handle
      articles(first: $first, last: $last, before: $startCursor, after: $endCursor, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
  ${ARTICLE_ITEM_FRAGMENT}
` as const;
