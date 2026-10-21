import {data, useFetcher, useLoaderData} from 'react-router';
import {generateArticleJsonLd, useTranslation, type Translate} from '@cloudcart/nitrogen';
import {RichText, keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/article.$handle';
import {crumbsJsonLd, errorMeta, metaTranslator, seoMeta, storeName, storeOrigin} from '~/lib/meta';
import {ARTICLE_HEADER_FRAGMENT, ArticleHeader} from '~/components/ArticleHeader';
import {Breadcrumbs, type Crumb} from '~/components/Breadcrumbs';
import {blogCrumbs} from '~/lib/blog';
import {Field, type FormError, FormStatus, TextArea} from '~/components/FormFields';
import {articlePath, blogPath} from '~/lib/urls';
import {DateText} from '~/components/DateText';
import {Badge} from '~/components/ui/Badge';
import {Button} from '~/components/ui/Button';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, payloadOf} from '~/lib/action';
import {FORM_USER_ERROR_FRAGMENT} from '~/lib/fragments';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({data, error, matches}) => {
  if (error || !data) return errorMeta(matches);
  const {article} = data;
  const path = articlePath(article.handle);
  const url = `${storeOrigin(matches)}${path}`;
  const t = metaTranslator(matches);
  // `excerpt` is the same SEO description: without one, a sentence of our own, as every page has (B-313).
  const description =
    article.seo.description ||
    t('seo.article', {article: article.title, blog: article.blog.title, store: storeName(matches)});
  return seoMeta(matches, {
    title: article.seo.title || article.title,
    description,
    url,
    type: 'article',
    image: article.image ?? undefined,
    jsonLd: [
      generateArticleJsonLd({...article, excerpt: description}, url),
      crumbsJsonLd(matches, articleCrumbs(article, t), path),
    ],
  });
};

/** The article's breadcrumb: the blog, the article's blog category, the article. */
function articleCrumbs(article: {title: string; blog: {title: string; handle: string}}, t: Translate): Crumb[] {
  return blogCrumbs(t, {title: article.blog.title, to: blogPath(article.blog.handle)}, {title: article.title});
}

/** /article/{handle} — a blog article and its comments. */
export async function loader({context, params}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;
  const buyer = await customerAccount.getBuyer();

  const {article, errors} = await storefront.query(ARTICLE_QUERY, {
    // A signed-in reader also sees their own comments still waiting for approval.
    variables: {handle: params.handle, buyer},
    cache: buyer ? storefront.CacheNone() : storefront.CacheShort(),
  });

  if (!article) throw missingResource(errors, `Article ${params.handle} not found`);

  return {article, isLoggedIn: Boolean(buyer)};
}

/** A new comment. Depending on the blog, it is published at once or after the merchant approves it. */
export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const {text, optional} = formFields(form);

  const articleCommentCreate = payloadOf(
    await context.storefront.mutate(COMMENT_CREATE_MUTATION, {
      variables: {
        buyer: await context.customerAccount.getBuyer(),
        input: {
          articleId: String(form.get('articleId')),
          content: text('content'),
          authorName: optional('authorName'),
          authorEmail: optional('authorEmail'),
        },
      },
    }),
    'articleCommentCreate',
  );

  const errors: FormError[] = articleCommentCreate ? articleCommentCreate.userErrors : [API_ERROR];
  return data({ok: errors.length === 0, message: articleCommentCreate?.message, errors});
}

export default function Article() {
  const {t} = useTranslation();
  const {article, isLoggedIn} = useLoaderData<typeof loader>();

  return (
    <article className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <Breadcrumbs items={articleCrumbs(article, t)} />
      <ArticleHeader article={article} />
      <div className="mx-auto mt-10 max-w-reading">
        <RichText data={article.contentHtml} headingStart={2} className="prose prose-tokens prose-reading max-w-none" />
        {article.tags.length > 0 && (
          <p className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                #{tag}
              </Badge>
            ))}
          </p>
        )}
        <Comments article={article} isLoggedIn={isLoggedIn} />
      </div>
    </article>
  );
}

function Comments({
  article,
  isLoggedIn,
}: {
  article: ReturnType<typeof useLoaderData<typeof loader>>['article'];
  isLoggedIn: boolean;
}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;
  const comments = article.comments.nodes;
  const policy = article.blog.commentPolicy;

  if (policy === 'CLOSED' && !comments.length) return null;

  return (
    <section aria-labelledby="comments-title" className="mt-12 border-t border-border pt-8">
      <h2 id="comments-title" className="mb-6 text-heading">
        {t('comments.title')}
      </h2>
      {comments.length ? (
        <ul className="flex flex-col gap-6">
          {comments.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{comment.author.name}</span>
                <DateText className="text-small text-muted" value={comment.createdAt} />
                {!comment.published && <Badge variant="neutral">{t('comments.awaiting')}</Badge>}
              </p>
              <p className="whitespace-pre-line">{comment.content}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">{t('comments.none')}</p>
      )}

      {policy !== 'CLOSED' &&
        (result?.ok ? (
          <div className="mt-6">
            <FormStatus message={result.message ?? t('comments.thanks')} />
          </div>
        ) : (
          <fetcher.Form method="post" className="mt-8 flex flex-col gap-4">
            <input type="hidden" name="articleId" value={article.id} />
            {!isLoggedIn && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('form.name')} name="authorName" required errors={result?.errors} autoComplete="name" />
                <Field
                  label={t('form.email')}
                  name="authorEmail"
                  type="email"
                  required
                  errors={result?.errors}
                  autoComplete="email"
                />
              </div>
            )}
            <TextArea label={t('comments.comment')} name="content" required errors={result?.errors} />
            {policy === 'MODERATED' && <p className="text-small text-muted">{t('comments.moderated')}</p>}
            <FormStatus errors={result?.errors} fields={['authorName', 'authorEmail', 'content']} />
            <Button type="submit" loading={fetcher.state !== 'idle'} className="self-start">
              {t('comments.post')}
            </Button>
          </fetcher.Form>
        ))}
    </section>
  );
}

const ARTICLE_QUERY = `#graphql
  query Article($handle: String!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    article(handle: $handle) {
      ...ArticleHeader
      id
      title
      handle
      contentHtml
      publishedAt
      updatedAt
      tags
      image {
        url
        altText
        width
        height
      }
      seo {
        title
        description
      }
      blog {
        title
        handle
        commentPolicy
      }
      comments(first: 50) {
        nodes {
          id
          content
          published
          createdAt
          author {
            name
          }
        }
      }
    }
  }
  ${ARTICLE_HEADER_FRAGMENT}
` as const;

const COMMENT_CREATE_MUTATION = `#graphql
  mutation ArticleCommentCreate($input: ArticleCommentCreateInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    articleCommentCreate(input: $input) {
      message
      userErrors {
        ...FormUserErrorFields
      }
    }
  }
  ${FORM_USER_ERROR_FRAGMENT}
` as const;
