import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import type {Route} from './+types/blog._index';
import {metaTranslator, pageMeta, storeName} from '~/lib/meta';
import {ArticleList, blogCategoryLinks} from '~/components/ArticleItem';
import {ListingHeader} from '~/components/ListingHeader';
import {ARTICLE_ITEM_FRAGMENT} from '~/lib/blog';
import {ButtonLink} from '~/components/ui/Button';

export const meta: Route.MetaFunction = ({location, matches}) => {
  const t = metaTranslator(matches);
  return pageMeta(matches, {
    title: t('content.blog'),
    path: '/blog',
    search: location.search,
    description: t('seo.blog', {store: storeName(matches)}),
    crumbs: [{title: t('content.blog')}],
  });
};

/** /blog — every article, newest first, with the blog's categories. */
export async function loader({context, request}: Route.LoaderArgs) {
  const {articles, blogs} = await context.storefront.query(BLOG_QUERY, {
    variables: getPaginationVariables(request, {pageBy: 12}),
    cache: context.storefront.CacheShort(),
  });

  return {articles, blogs: blogs.nodes};
}

export default function Blog() {
  const {t} = useTranslation();
  const {articles, blogs} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader
        crumbs={[{title: t('content.blog')}]}
        title={t('content.blog')}
        links={blogCategoryLinks(blogs, t('blog.all'))}
        linksLabel={t('blog.categories')}
        currentLink="/blog"
      />
      <ArticleList
        articles={articles}
        emptyAction={
          <ButtonLink to="/categories" prefetch="intent" variant="secondary">
            {t('actions.browseCategories')}
          </ButtonLink>
        }
      />
    </div>
  );
}

const BLOG_QUERY = `#graphql
  query BlogIndex($first: Int, $last: Int, $startCursor: String, $endCursor: String) {
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
    blogs(first: 50) {
      nodes {
        title
        handle
      }
    }
  }
  ${ARTICLE_ITEM_FRAGMENT}
` as const;
