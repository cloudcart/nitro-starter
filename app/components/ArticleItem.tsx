import type {ReactNode} from 'react';
import {type PaginationProps, useTranslation} from '@cloudcart/nitrogen';
import {Image, PaginatedResourceSection, KeptLink} from '@cloudcart/nitrogen-react';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {DateText} from '~/components/DateText';
import {buttonClass} from '~/components/ui/Button';
import {EmptyState} from '~/components/ui/EmptyState';
import {articlePath, blogPath} from '~/lib/urls';

/**
 * An article card's picture width in the page, for the browser to pick its size (B-393): one column, two from 750 px and
 * three from 990 px (`ArticleList`), with 1.5rem gaps in the page box (90rem, gutters of 2.5rem from 750 px and 1.25rem
 * below).
 */
const ARTICLE_CARD_SIZES =
  '(min-width: 1440px) 438px, (min-width: 990px) calc(33.34vw - 43px), (min-width: 750px) calc(50vw - 52px), calc(100vw - 40px)';

/** An article in a list: its image at 3:2, its blog and date, its title and excerpt. */
export function ArticleItem({article, loading}: {article: ArticleItemFragment; loading?: 'eager' | 'lazy'}) {
  const {t} = useTranslation();
  return (
    <KeptLink to={articlePath(article.handle)} className="group flex flex-col gap-2 hover:no-underline">
      <div className="mb-1 aspect-[3/2] overflow-hidden rounded-card bg-surface">
        {article.image && (
          <Image
            data={article.image}
            // The title is in the same link: the picture adds nothing for a screen reader (B-444).
            alt=""
            aspectRatio="3/2"
            loading={loading}
            sizes={ARTICLE_CARD_SIZES}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <p className="text-small text-muted">
        {article.blog.title}
        {article.publishedAt && (
          <>
            {t('format.separator')}
            <DateText value={article.publishedAt} options={{day: 'numeric', month: 'long', year: 'numeric'}} />
          </>
        )}
      </p>
      <h2 className="line-clamp-2 text-card group-hover:underline">{article.title}</h2>
      {article.excerpt && <p className="line-clamp-3 text-muted">{article.excerpt}</p>}
    </KeptLink>
  );
}

/**
 * A blog's articles: one column on a phone, two from 750 px, three from 990 px, with "Load more"; none, the project's
 * empty state with the page's way on (B-411).
 */
export function ArticleList({
  articles,
  emptyAction,
}: {
  articles: PaginationProps<ArticleItemFragment>['connection'] & {nodes: ArticleItemFragment[]};
  emptyAction?: ReactNode;
}) {
  const {t} = useTranslation();

  if (!articles.nodes.length) return <EmptyState text={t('blog.empty')} action={emptyAction} />;

  return (
    <PaginatedResourceSection<ArticleItemFragment>
      connection={articles}
      resourcesClassName="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3"
      paginationClassName={`my-8 ${buttonClass('secondary', {fullWidth: true})}`}
      previousLabel={t('listing.loadPrevious')}
      nextLabel={t('listing.loadMore')}
      loadingLabel={t('listing.loading')}
    >
      {({node: article, index}) => (
        <ArticleItem key={article.id} article={article} loading={index < 3 ? 'eager' : 'lazy'} />
      )}
    </PaginatedResourceSection>
  );
}

/** The blog's categories as links for `ListingHeader`, after "All" (the whole blog). */
export function blogCategoryLinks(blogs: Array<{title: string; handle: string}>, allLabel: string) {
  return blogs.length
    ? [{title: allLabel, to: '/blog'}, ...blogs.map((blog) => ({title: blog.title, to: blogPath(blog.handle)}))]
    : [];
}
