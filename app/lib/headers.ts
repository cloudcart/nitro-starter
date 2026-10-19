import type {HeadersFunction} from 'react-router';

/**
 * The `headers` of a page that shows one customer's own data: no cache — shared or the browser's — keeps a copy, so
 * the page is not shown again from one after sign-out (B-188). A route's children without `headers` of their own
 * get it too. React Router sends a loader's headers only through this export, so they are set here.
 */
export const privatePageHeaders: HeadersFunction = () => ({'Cache-Control': 'private, no-store'});
