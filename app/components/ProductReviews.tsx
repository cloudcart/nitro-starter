import {Fragment, Suspense, useState} from 'react';
import {Await, Link, useFetcher, useLocation, useSearchParams} from 'react-router';
import {Pagination, useTranslation} from '@cloudcart/nitrogen';
import type {
  ProductReviewItemFragment,
  ProductReviewsQuery,
  ReviewsSectionDisplayFragment,
} from 'storefrontapi.generated';
import {Field, FormStatus, TextArea} from './FormFields';
import type {ProductFormResult} from './ProductRequestForms';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT, showsRating} from './ReviewDisplay';

/**
 * How the merchant has the reviews section shown: the ratings' display, the overall rating alone or the list too
 * (`summaryOnly`), and whether customers answer reviews — read with the product page's settings.
 */
export const REVIEWS_SECTION_DISPLAY_FRAGMENT = `#graphql
  fragment ReviewsSectionDisplay on ProductReviewSettings {
    ...ProductReviewDisplay
    summaryOnly
    customersCanAnswer
  }
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
import {StarRating} from './StarRating';
import {DateText} from './DateText';
import {Button, buttonClass} from '~/components/ui/Button';
import {Dialog} from '~/components/Dialog';
import {ChevronDownIcon, ReviewsIcon, StarIcon} from '~/components/ui/icons';
import {RequiredMark} from '~/components/ui/Field';
import {EmptyState} from '~/components/ui/EmptyState';
import {formatCount, formatPercent} from '~/lib/format';

/** The URL parameters of the review list: its star filter, and its pages (`getPaginationVariables`' `reviews` namespace). */
export const REVIEWS_NAMESPACE = 'reviews';
export const REVIEWS_RATING_PARAM = `${REVIEWS_NAMESPACE}_rating`;
export const REVIEWS_PAGE_SIZE = 10;

/**
 * An address's search in two: the part the reviews follow — their star filter and pages, all named `reviews_…` — and
 * the rest (B-376).
 */
export function splitReviewsSearch(url: Pick<URL, 'searchParams'>) {
  const reviews = new URLSearchParams();
  const rest = new URLSearchParams();
  for (const [key, value] of url.searchParams)
    (key.startsWith(`${REVIEWS_NAMESPACE}_`) ? reviews : rest).append(key, value);
  return {reviews: reviews.toString(), rest: rest.toString()};
}

/** The star filter the URL asks for: 1–5, or null for every review. */
export function reviewRatingFilter(searchParams: URLSearchParams): number | null {
  const rating = Number(searchParams.get(REVIEWS_RATING_PARAM));
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

type Reviews = Promise<ProductReviewsQuery | null>;

/**
 * The product's reviews in one section: the average and a bar per rating, the list filtered by rating in the
 * merchant's order, each review's replies and — for a signed-in customer, when the merchant takes answers from
 * customers — a form to answer it, and the form to write a review. A merchant who shows only the overall rating
 * gets the average and the bars, no list.
 */
export function ProductReviews({
  reviews,
  display,
  productId,
  isLoggedIn,
}: {
  reviews: Reviews;
  display: ReviewsSectionDisplayFragment;
  productId: string;
  isLoggedIn: boolean;
}) {
  const {t} = useTranslation();
  const canAnswer = isLoggedIn && display.customersCanAnswer;
  const [writing, setWriting] = useState(false);
  const write = () => setWriting(true);

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-8 border-t border-border pt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="text-heading">
          {t('reviews.title')}
        </h2>
        {/* With no review yet, the invitation below has the button. */}
        <Suspense fallback={null}>
          <Await resolve={reviews} errorElement={null}>
            {(data) =>
              data?.product?.reviewSummary?.totalCount ? (
                <Button variant="secondary" onClick={write}>
                  {t('reviews.write')}
                </Button>
              ) : null
            }
          </Await>
        </Suspense>
      </div>
      <Suspense
        fallback={
          // The panel of "No reviews yet", the most common answer, at its size with its words hidden (B-420).
          <div aria-busy="true">
            <p className="sr-only">{t('reviews.loading')}</p>
            <ReviewsEmpty onWrite={write} className="*:invisible" />
          </div>
        }
      >
        <Await resolve={reviews} errorElement={<p className="mt-6 text-small text-muted">{t('reviews.failed')}</p>}>
          {(data) => <ReviewsBody data={data} display={display} canAnswer={canAnswer} onWrite={write} />}
        </Await>
      </Suspense>
      <Dialog open={writing} onClose={() => setWriting(false)} heading={t('reviews.share')}>
        {/* Within the dialog's margins, as every dialog's content (B-234). */}
        <div className="p-5">
          <p className="text-small text-muted">{t('reviews.shareText')}</p>
          <ReviewForm productId={productId} isLoggedIn={isLoggedIn} />
        </div>
      </Dialog>
    </section>
  );
}

/** With no review yet: one invitation across the row, its button opening the form. */
function ReviewsEmpty({onWrite, className = ''}: {onWrite: () => void; className?: string}) {
  const {t} = useTranslation();
  return (
    <EmptyState
      icon={ReviewsIcon}
      title={t('reviews.noneTitle')}
      text={t('reviews.shareText')}
      className={`mt-6 ${className}`}
      action={
        <Button variant="secondary" onClick={onWrite}>
          {t('reviews.write')}
        </Button>
      }
    />
  );
}

/**
 * What the reviews show: with none yet, one invitation across the row; the average beside the list, filled; the
 * average alone where the merchant shows only the overall rating.
 */
function ReviewsBody({
  data,
  display,
  canAnswer,
  onWrite,
}: {
  data: ProductReviewsQuery | null;
  display: ReviewsSectionDisplayFragment;
  canAnswer: boolean;
  onWrite: () => void;
}) {
  const summary = data?.product?.reviewSummary ?? null;

  if (!summary || summary.totalCount === 0) return <ReviewsEmpty onWrite={onWrite} />;

  if (display.summaryOnly) {
    return (
      <div className="mt-6 max-w-narrow">
        <ReviewSummary summary={summary} display={display} />
      </div>
    );
  }

  return (
    <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-x-12">
      <div className="lg:col-span-4">
        <ReviewSummary summary={summary} display={display} />
      </div>
      <div className="mt-10 lg:col-span-8 lg:mt-0">
        <ReviewList data={data} canAnswer={canAnswer} />
      </div>
    </div>
  );
}

type Summary = NonNullable<NonNullable<ProductReviewsQuery['product']>['reviewSummary']>;

/**
 * The average and a bar per rating, five stars down to one. A bar filters the list to its rating while
 * there is a list with reviews to filter.
 */
function ReviewSummary({summary, display}: {summary: Summary | null; display: ReviewsSectionDisplayFragment}) {
  const {t, language} = useTranslation();
  const [searchParams] = useSearchParams();
  const active = reviewRatingFilter(searchParams);

  if (!summary || !showsRating(summary, display)) {
    return <p className="mt-3 text-small text-muted">{t('reviews.none')}</p>;
  }

  const filters = !display.summaryOnly && summary.totalCount > 0;

  return (
    <>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-h2">
          {new Intl.NumberFormat(language, {minimumFractionDigits: 1, maximumFractionDigits: 1}).format(
            summary.averageRating,
          )}
        </p>
        <div>
          <StarRating rating={summary.averageRating} size="md" />
          <p className="mt-1 text-small text-muted">{t('reviews.basedOn', {count: summary.totalCount})}</p>
        </div>
      </div>

      <h3 className="sr-only">{t('reviews.byRating')}</h3>
      <ul className="-mx-2 mt-6 flex flex-col gap-1">
        {summary.ratingDistribution.map(({rating, count}) => {
          const share = summary.totalCount > 0 ? Math.round((count / summary.totalCount) * 100) : 0;
          const isActive = active === rating;
          const bar = (
            <>
              <span className="flex w-10 shrink-0 items-center gap-0.5 font-medium">
                <span aria-hidden="true">{rating}</span>
                <StarIcon aria-hidden="true" className="size-4" />
                <span className="sr-only">{t('reviews.stars', {count: rating})}</span>
              </span>
              <span aria-hidden="true" className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                <span className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{width: `${share}%`}} />
              </span>
              <span className="w-16 shrink-0 text-right text-muted tabular-nums">
                {formatCount(count, language)} ({formatPercent(share, language)})
              </span>
            </>
          );
          return (
            <li key={rating}>
              {filters ? (
                <ReviewFilterLink
                  rating={isActive ? null : rating}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex min-h-9 items-center gap-3 rounded-card px-2 text-small ${isActive ? 'bg-surface ring-1 ring-border' : 'hover:bg-surface'}`}
                >
                  {bar}
                </ReviewFilterLink>
              ) : (
                <div className="flex min-h-9 items-center gap-3 px-2 text-small">{bar}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The star filter and the reviews it leaves in the merchant's order, ten at a time with "Show more reviews". */
function ReviewList({data, canAnswer}: {data: ProductReviewsQuery | null; canAnswer: boolean}) {
  const {t} = useTranslation();
  const [searchParams] = useSearchParams();
  const active = reviewRatingFilter(searchParams);
  const product = data?.product;
  const summary = product?.reviewSummary;

  if (!product?.reviews || !summary || summary.totalCount === 0) return null;

  const filters = [
    {rating: null, label: t('reviews.all'), count: summary.totalCount},
    ...summary.ratingDistribution.map(({rating, count}) => ({rating, label: `${rating} ★`, count})),
  ];

  return (
    <>
      {/* The reviews' titles (h4) sit under this, not under the summary's "Reviews by rating" (B-448). */}
      <h3 className="sr-only">{t('reviews.list')}</h3>
      <nav aria-label={t('reviews.filter')} className="flex flex-wrap items-center gap-2">
        {filters.map(({rating, label, count}) => {
          const isActive = active === rating;
          return (
            <ReviewFilterLink
              key={label}
              rating={rating}
              aria-current={isActive ? 'true' : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-button border px-3 text-small font-medium ${
                isActive
                  ? 'border-foreground bg-foreground text-background'
                  : count === 0
                    ? 'border-border text-muted'
                    : 'border-border hover:border-foreground'
              }`}
            >
              {rating === null ? label : <span aria-hidden="true">{label}</span>}
              {rating !== null && <span className="sr-only">{t('reviews.stars', {count: rating})}</span>}
              <span className={isActive ? 'text-background/70' : 'text-muted'}>{count}</span>
            </ReviewFilterLink>
          );
        })}
      </nav>

      <Pagination connection={product.reviews} namespace={REVIEWS_NAMESPACE}>
        {({nodes, NextLink, PreviousLink, isLoading}) => (
          <>
            <PreviousLink className="mt-6 block text-center text-small font-medium underline underline-offset-4">
              {isLoading ? t('listing.loading') : t('reviews.previous')}
            </PreviousLink>
            {nodes.length === 0 ? (
              <p className="mt-8 text-small text-muted">
                {t('reviews.noneWithRating', {count: active ?? 0})}{' '}
                <ReviewFilterLink rating={null} className="font-medium text-foreground underline">
                  {t('reviews.showAll')}
                </ReviewFilterLink>
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {nodes.map((review) => (
                  <li key={review.id} className="py-8">
                    <Review review={review} canAnswer={canAnswer} />
                  </li>
                ))}
              </ul>
            )}
            <NextLink className={`${buttonClass('secondary', {fullWidth: true})} mt-2`}>
              {isLoading ? t('listing.loading') : t('reviews.more')}
            </NextLink>
          </>
        )}
      </Pagination>
    </>
  );
}

type ReviewNode = NonNullable<NonNullable<ProductReviewsQuery['product']>['reviews']>['nodes'][number];

/** One review: who wrote it and when, the rating, the text, the replies under a toggle, and the answer form. */
function Review({review, canAnswer}: {review: ReviewNode; canAnswer: boolean}) {
  const {t} = useTranslation();
  const replies = review.answers.length;

  return (
    <article>
      <ReviewHeader review={review} />
      {review.title && <h4 className="mt-4 font-medium">{review.title}</h4>}
      <p className="mt-2 text-small whitespace-pre-line">{review.comment}</p>

      {replies > 0 && (
        <details className="group mt-4">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-small font-medium [&::-webkit-details-marker]:hidden">
            <ReviewsIcon aria-hidden="true" className="size-4 text-muted" />
            <span className="group-open:hidden">{t('reviews.showReplies', {count: replies})}</span>
            <span className="hidden group-open:inline">{t('reviews.hideReplies', {count: replies})}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 text-muted transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="mt-4 flex flex-col gap-4 border-l-2 border-border pl-4 md:ml-5">
            {review.answers.map((answer) => (
              <li key={answer.id}>
                <ReviewHeader review={answer} small />
                <p className="mt-2 text-small whitespace-pre-line">{answer.comment}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {canAnswer && <AnswerForm review={review} />}
    </article>
  );
}

/**
 * "Answer", for a signed-in customer when the merchant takes answers from customers: opens a short form in
 * place. The store publishes the answer at once or after approval, and says which.
 */
function AnswerForm({review}: {review: ReviewNode}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<ProductFormResult>({key: `review-answer-${review.id}`});
  const result = fetcher.data?.intent === 'reviewAnswer' ? fetcher.data : undefined;

  if (result?.ok) return <FormStatus message={result.message ?? t('reviews.answerThanks')} />;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-9 items-center text-small font-medium underline underline-offset-4"
      >
        {t('reviews.answer')}
      </button>
    );
  }

  return (
    <fetcher.Form method="post" className="mt-4 flex flex-col gap-3 md:ml-5">
      <input type="hidden" name="intent" value="reviewAnswer" />
      <input type="hidden" name="reviewId" value={review.id} />
      <TextArea
        label={t('reviews.answerLabel', {name: review.author.name})}
        name="comment"
        required
        maxLength={1000}
        errors={result?.errors}
      />
      <FormStatus errors={result?.errors} fields={['comment']} />
      <div className="flex gap-3">
        <Button type="submit" loading={fetcher.state !== 'idle'}>
          {t('reviews.answerSend')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          {t('reviews.cancel')}
        </Button>
      </div>
    </fetcher.Form>
  );
}

function ReviewHeader({review, small = false}: {review: ProductReviewItemFragment; small?: boolean}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full bg-surface font-medium ${small ? 'size-8 text-h6' : 'size-10 text-small'}`}
      >
        {review.author.initials}
      </span>
      <div className="min-w-0">
        <p className="text-small font-medium">{review.author.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {!small && <StarRating rating={review.rating} />}
          <DateText className="text-h6 font-normal text-muted" value={review.createdAt} />
        </div>
      </div>
    </div>
  );
}

/** A link to this page with the list filtered to `rating` (all reviews for null), from its first page and without moving the page. */
function ReviewFilterLink({rating, ...props}: {rating: number | null} & Omit<React.ComponentProps<typeof Link>, 'to'>) {
  const {search} = useLocation();
  const params = new URLSearchParams(search);
  params.delete(`${REVIEWS_NAMESPACE}_cursor`);
  params.delete(`${REVIEWS_NAMESPACE}_direction`);
  if (rating === null) params.delete(REVIEWS_RATING_PARAM);
  else params.set(REVIEWS_RATING_PARAM, String(rating));
  const query = params.toString();

  return <Link {...props} to={{search: query ? `?${query}` : ''}} preventScrollReset replace rel="nofollow" />;
}

function ReviewForm({productId, isLoggedIn}: {productId: string; isLoggedIn: boolean}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<ProductFormResult>({key: `review-${productId}`});
  const result = fetcher.data?.intent === 'review' ? fetcher.data : undefined;

  if (result?.ok) return <FormStatus message={result.message ?? t('reviews.thanks')} />;

  return (
    <fetcher.Form method="post" className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="intent" value="review" />
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="text-small font-medium">
          {t('reviews.rating')}
          <RequiredMark />
        </legend>
        {/* Five down to one, laid out right to left: a checked star lights itself and every star after it in
            the markup — the lower ones, shown to its left. */}
        <div className="mt-2 flex w-fit flex-row-reverse justify-end gap-1 rounded-card has-focus-visible:ring-2 has-focus-visible:ring-accent">
          {[5, 4, 3, 2, 1].map((value) => (
            <Fragment key={value}>
              <input
                id={`review-rating-${value}`}
                type="radio"
                name="rating"
                value={value}
                required
                className="peer sr-only"
              />
              <label
                htmlFor={`review-rating-${value}`}
                className="cursor-pointer text-border peer-checked:text-foreground hover:text-muted"
              >
                <StarIcon aria-hidden="true" className="size-7" />
                <span className="sr-only">{t('reviews.stars', {count: value})}</span>
              </label>
            </Fragment>
          ))}
        </div>
      </fieldset>
      <Field label={t('reviews.reviewTitle')} name="title" required errors={result?.errors} />
      <TextArea label={t('reviews.comment')} name="comment" required errors={result?.errors} />
      {!isLoggedIn && (
        <>
          <Field label={t('form.name')} name="authorName" required errors={result?.errors} autoComplete="name" />
          <Field
            label={t('form.email')}
            name="authorEmail"
            type="email"
            required
            errors={result?.errors}
            autoComplete="email"
          />
        </>
      )}
      <FormStatus errors={result?.errors} fields={['title', 'comment', 'authorName', 'authorEmail']} />
      <Button type="submit" loading={fetcher.state !== 'idle'}>
        {t('reviews.send')}
      </Button>
    </fetcher.Form>
  );
}
