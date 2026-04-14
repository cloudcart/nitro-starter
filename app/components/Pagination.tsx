import {Link, useSearchParams, useNavigation} from 'react-router';
import {useMemo} from 'react';
import type {ReactNode, FC} from 'react';

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface Connection<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

export interface PaginationRenderProps<T> {
  nodes: T[];
  NextLink: FC<{children: ReactNode; className?: string}>;
  PreviousLink: FC<{children: ReactNode; className?: string}>;
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Page-number based pagination component.
 *
 * Uses `?page=N` URL format instead of cursor-based `?cursor=...&direction=after`.
 * The server uses `getPaginationVariables` which converts page numbers to the
 * appropriate first/after variables for the API.
 */
export function Pagination<T>({
  connection,
  children,
}: {
  connection: Connection<T>;
  children: (args: PaginationRenderProps<T>) => ReactNode;
}) {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const {nodes, pageInfo} = connection;

  const currentPage = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const nextUrl = useMemo(() => {
    if (!pageInfo.hasNextPage) return null;
    const params = new URLSearchParams(searchParams);
    params.delete('cursor');
    params.delete('direction');
    params.set('page', String(currentPage + 1));
    return `?${params.toString()}`;
  }, [pageInfo.hasNextPage, searchParams, currentPage]);

  const prevUrl = useMemo(() => {
    if (currentPage <= 1) return null;
    const params = new URLSearchParams(searchParams);
    params.delete('cursor');
    params.delete('direction');
    if (currentPage - 1 <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(currentPage - 1));
    }
    return `?${params.toString()}`;
  }, [searchParams, currentPage]);

  const NextLink: FC<{children: ReactNode; className?: string}> = ({children: label, className}) => {
    if (!nextUrl) return null;
    return (
      <Link to={nextUrl} preventScrollReset prefetch="intent" className={className}>
        {label}
      </Link>
    );
  };

  const PreviousLink: FC<{children: ReactNode; className?: string}> = ({children: label, className}) => {
    if (!prevUrl) return null;
    return (
      <Link to={prevUrl} preventScrollReset prefetch="intent" className={className}>
        {label}
      </Link>
    );
  };

  return (
    <>
      {children({
        nodes,
        NextLink,
        PreviousLink,
        isLoading,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: currentPage > 1,
      })}
    </>
  );
}
