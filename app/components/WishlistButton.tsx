import {useFetcher, useRouteLoaderData} from 'react-router';
import {useEffect, useState} from 'react';
import {HeartIcon} from '@heroicons/react/24/outline';
import {HeartIcon as HeartSolid} from '@heroicons/react/24/solid';

export function WishlistButton({
  productId,
  className = '',
  size = 'md',
}: {
  productId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const rootData = useRouteLoaderData('root') as {wishlistIds?: string[]} | undefined;
  const wishlistIds = rootData?.wishlistIds ?? [];
  const initiallyInWishlist = wishlistIds.includes(productId);

  const fetcher = useFetcher();
  // Optimistic state: toggles immediately on click, reconciles on server response.
  const [optimisticIn, setOptimisticIn] = useState(initiallyInWishlist);

  useEffect(() => {
    setOptimisticIn(initiallyInWishlist);
  }, [initiallyInWishlist]);

  // If the fetcher reports a result, use it
  const serverResult = (fetcher.data as {inWishlist?: boolean; error?: string} | undefined);
  const inWishlist = fetcher.state === 'submitting'
    ? optimisticIn
    : (serverResult?.inWishlist ?? initiallyInWishlist);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !inWishlist;
    setOptimisticIn(next);
    fetcher.submit(
      {productId},
      {method: next ? 'POST' : 'DELETE', action: '/api/wishlist'},
    );
  };

  const sizeClasses = {
    sm: 'size-7',
    md: 'size-8',
    lg: 'size-10',
  }[size];
  const iconSize = {
    sm: 'size-3.5',
    md: 'size-4',
    lg: 'size-5',
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={fetcher.state === 'submitting'}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`flex items-center justify-center ${sizeClasses} bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all disabled:opacity-60 ${className}`}
    >
      {inWishlist ? (
        <HeartSolid className={`${iconSize} text-red-500`} />
      ) : (
        <HeartIcon className={`${iconSize} text-gray-600`} />
      )}
    </button>
  );
}
