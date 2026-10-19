import {Link} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import type {ArticleHeaderFragment} from 'storefrontapi.generated';
import {DateText} from '~/components/DateText';
import {blogPath} from '~/lib/urls';

/** What the article's header shows, for the article page's query. */
export const ARTICLE_HEADER_FRAGMENT = `#graphql
  fragment ArticleHeader on Article {
    title
    publishedAt
    authorV2 {
      name
    }
    image {
      url
      altText
      width
      height
    }
    blog {
      title
      handle
    }
  }
` as const;

/**
 * An article's header: centred, the blog it belongs to, the title, the date and the author; then the article's
 * image across the page, at its own ratio. A part the article does not have is left out.
 */
export function ArticleHeader({article}: {article: ArticleHeaderFragment}) {
  const {t} = useTranslation();
  const {publishedAt, authorV2: author, image, blog} = article;

  return (
    <header className="flex flex-col gap-10">
      <div className="mx-auto flex max-w-reading flex-col items-center gap-4 text-center">
        <Link
          to={blogPath(blog.handle)}
          className="text-small tracking-label text-muted uppercase hover:text-foreground"
        >
          {blog.title}
        </Link>
        <h1 className="text-title">{article.title}</h1>
        {(publishedAt || author) && (
          <p className="text-muted">
            {publishedAt && <DateText value={publishedAt} options={{day: 'numeric', month: 'long', year: 'numeric'}} />}
            {publishedAt && author && t('format.separator')}
            {author?.name}
          </p>
        )}
      </div>
      {image && (
        <Image
          data={image}
          alt={image.altText ?? ''}
          // The page box's width less its gutters (90rem; 2.5rem each from 750 px, 1.25rem below) (B-393).
          sizes="(min-width: 1440px) 1360px, (min-width: 750px) calc(100vw - 80px), calc(100vw - 40px)"
          loading="eager"
          fetchPriority="high"
          className="w-full rounded-card"
        />
      )}
    </header>
  );
}
