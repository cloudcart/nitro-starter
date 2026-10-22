import {useLocation} from 'react-router';

/** The history state of an entry a change of a listing's filters or sort made. */
const REFINED = 'listingRefined';

/**
 * How a change of a listing's filters or sort navigates: the first adds an entry to the history, the ones after it
 * replace that entry, so a step back leaves them all at once (T-600). Read from the entry shown: one on its way is not
 * in the history until it arrives, so a change made meanwhile adds the one entry in its place.
 */
export function useRefinementNavigation() {
  const {state} = useLocation();
  return {replace: (state as Record<string, unknown> | null)?.[REFINED] === true, state: {[REFINED]: true}} as const;
}
