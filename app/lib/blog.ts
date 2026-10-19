import type {Translate} from '@cloudcart/nitrogen';
import type {Crumb} from '~/components/Breadcrumbs';

/** A breadcrumb trail under the blog: the blog's page, then `crumbs`. */
export function blogCrumbs(t: Translate, ...crumbs: Crumb[]): Crumb[] {
  return [{title: t('content.blog'), to: '/blog'}, ...crumbs];
}

// An article as the blog's listings show it.
export const ARTICLE_ITEM_FRAGMENT = `#graphql
  fragment ArticleItem on Article {
    id
    title
    handle
    excerpt
    publishedAt
    image {
      url
      width
      height
    }
    blog {
      title
    }
  }
` as const;
