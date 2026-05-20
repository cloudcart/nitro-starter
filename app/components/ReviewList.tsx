import type {ProductReviewSummary, ProductReviewNode} from '@cloudcart/nitrogen';
import {StarRating} from './StarRating';
import {StarIcon} from '@heroicons/react/20/solid';

interface ReviewListProps {
  reviews: ProductReviewNode[];
  summary: ProductReviewSummary | null;
  totalCount: number;
}

export function ReviewList({reviews, summary, totalCount}: ReviewListProps) {
  if (!summary || totalCount === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-gray-200">
      <h2 className="text-2xl font-bold tracking-tight mb-8">Customer Reviews</h2>

      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        {/* Summary sidebar */}
        <ReviewSummary summary={summary} totalCount={totalCount} reviews={reviews} />

        {/* Individual reviews */}
        <div className="flex flex-col divide-y divide-gray-100">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewSummary({summary, totalCount, reviews}: {summary: ProductReviewSummary; totalCount: number; reviews: ProductReviewNode[]}) {
  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return {star, count, percentage: totalCount > 0 ? (count / totalCount) * 100 : 0};
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Big average rating */}
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold text-dark">{summary.averageRating.toFixed(1)}</span>
        <div>
          <StarRating rating={summary.averageRating} size="md" showEmpty />
          <p className="text-sm text-gray-500 mt-1">{totalCount} {totalCount === 1 ? 'review' : 'reviews'}</p>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="flex flex-col gap-1.5">
        {distribution.map(({star, count, percentage}) => (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-7 text-right text-gray-500 shrink-0">{star}</span>
            <StarIcon className="size-3.5 text-amber-400 shrink-0" />
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{width: `${percentage}%`}}
              />
            </div>
            <span className="w-8 text-right text-xs text-gray-400 shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewItem({review}: {review: ProductReviewNode}) {
  return (
    <div className="py-6 first:pt-0">
      <div className="flex items-start gap-3">
        {/* Author avatar */}
        <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">
          {review.author.initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name + date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-dark">{review.author.name}</span>
            <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
          </div>

          {/* Stars */}
          <div className="mt-1">
            <StarRating rating={review.rating} showEmpty />
          </div>

          {/* Title */}
          {review.title && (
            <h4 className="text-sm font-semibold text-dark mt-2">{review.title}</h4>
          )}

          {/* Comment */}
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.comment}</p>

          {/* Replies */}
          {review.answers?.length ? (
            <div className="mt-4 pl-4 border-l-2 border-gray-100 flex flex-col gap-3">
              {review.answers.map((reply) => (
                <div key={reply.id}>
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-brand/10 flex items-center justify-center text-xs font-semibold text-brand shrink-0">
                      {reply.author.initials}
                    </div>
                    <span className="text-sm font-semibold text-dark">{reply.author.name}</span>
                    <span className="text-xs text-gray-400">{formatDate(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-9 leading-relaxed">{reply.comment}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
