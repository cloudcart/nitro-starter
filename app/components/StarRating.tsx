import {StarIcon} from '@heroicons/react/20/solid';
import {StarIcon as StarOutlineIcon} from '@heroicons/react/24/outline';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  showEmpty?: boolean;
}

export function StarRating({rating, count, size = 'sm', showEmpty = false}: StarRatingProps) {
  if (!showEmpty && (!rating || rating === 0) && (!count || count === 0)) return null;

  const starSize = size === 'sm' ? 'size-3.5' : 'size-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rating >= star;
          const half = !filled && rating >= star - 0.5;

          return (
            <span key={star} className="relative">
              {filled ? (
                <StarIcon className={`${starSize} text-amber-400`} />
              ) : half ? (
                <>
                  <StarOutlineIcon className={`${starSize} text-gray-300`} />
                  <span className="absolute inset-0 overflow-hidden w-1/2">
                    <StarIcon className={`${starSize} text-amber-400`} />
                  </span>
                </>
              ) : (
                <StarOutlineIcon className={`${starSize} text-gray-300`} />
              )}
            </span>
          );
        })}
      </div>
      {count != null && (
        <span className={`${textSize} text-gray-400`}>({count})</span>
      )}
    </div>
  );
}
