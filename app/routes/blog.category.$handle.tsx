import {useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/blog.category.$handle';
import {crumbsJsonLd, listingUrl, metaTranslator, seoMeta, storeName} from '~/lib/meta';
import {ArticleList, blogCategoryLinks} from '~/components/ArticleItem';
import {ListingHeader} from '~/components/ListingHeader';
import {ARTICLE_ITEM_FRAGMENT, blogCrumbs} from '~/lib/blog';
import {blogPath} from '~/lib/urls';
import {missingResource} from '~/lib/missing';
import {ButtonLink} from '~/components/ui/Button';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  // A page that throws is titled by the root's `meta`.
  if (!data) return [];
  const {blog} = data;
  const t = metaTranslator(matches);
  const path = blogPath(blog.handle);
  return seoMeta(matches, {
    title: blog.seo.title || blog.title,
    description: blog.seo.description || t('seo.blogCategory', {blog: blog.title, store: storeName(matches)}),
    url: listingUrl(matches, path, location.search),
    image: blog.image ?? undefined,
    jsonLd: crumbsJsonLd(matches, blogCrumbs(t, {title: blog.title}), path),
  });
};

/** /blog/category/{handle} — one category of the blog and its articles. */
export async function loader({context, params, request}: Route.LoaderArgs) {
  const {blog, blogs, errors} = await context.storefront.query(BLOG_CATEGORY_QUERY, {
    variables: {handle: params.handle, ...getPaginationVariables(request, {pageBy: 12})},
    cache: context.storefront.CacheShort(),
  });

  if (!blog) throw missingResource(errors, `Blog ${params.handle} not found`);

  return {blog, blogs: blogs.nodes};
}

export default function BlogCategory() {
  const {t} = useTranslation();
  const {blog, blogs} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader
        crumbs={blogCrumbs(t, {title: blog.title})}
        title={blog.title}
        links={blogCategoryLinks(blogs, t('blog.all'))}
        linksLabel={t('blog.categories')}
        currentLink={blogPath(blog.handle)}
      />
      <ArticleList
        articles={blog.articles}
        emptyAction={
          <ButtonLink to="/blog" prefetch="intent" variant="secondary">
            {t('blog.allArticles')}
          </ButtonLink>
        }
      />
    </div>
  );
}

const BLOG_CATEGORY_QUERY = `#graphql
  query BlogCategory($handle: String!, $first: Int, $last: Int, $startCursor: String, $endCursor: String) {
    blog(handle: $handle) {
      title
      handle
      seo {
        title
        description
      }
      image {
        url
        altText
        width
        height
      }
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
    blogs(first: 50) {
      nodes {
        title
        handle
      }
    }
  }
  ${ARTICLE_ITEM_FRAGMENT}
` as const;
