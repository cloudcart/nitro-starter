import {useTranslation} from '@cloudcart/nitrogen';
import {StarIcon} from '~/components/ui/icons';
import {formatCount} from '~/lib/format';

/** A rating out of five, as stars, with the number of reviews. Read as one phrase: "Rated 4.5 out of 5, 12 reviews". */
export function StarRating({rating, count, size = 'sm'}: {rating: number; count?: number; size?: 'sm' | 'md'}) {
  const {t, language} = useTranslation();
  const starSize = size === 'sm' ? 'size-3.5' : 'size-5';
  const shownRating = new Intl.NumberFormat(language, {maximumFractionDigits: 1}).format(rating);
  const rated = t('product.rating', {rating: shownRating});

  return (
    <span
      role="img"
      aria-label={count != null ? t('product.ratingWithCount', {rating: shownRating, count}) : rated}
      className="inline-flex items-center gap-1"
    >
      <span className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, rating - (star - 1)));
          return (
            <span key={star} className="relative">
              <StarIcon className={`${starSize} text-border`} />
              <span className="absolute inset-0 overflow-hidden" style={{width: `${fill * 100}%`}}>
                <StarIcon className={`${starSize} text-foreground`} />
              </span>
            </span>
          );
        })}
      </span>
      {count != null && (
        <span className={`${size === 'sm' ? 'text-small' : 'text-body'} text-muted`}>
          ({formatCount(count, language)})
        </span>
      )}
    </span>
  );
}
