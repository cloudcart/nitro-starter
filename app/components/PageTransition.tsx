import {type ReactNode, useEffect, ViewTransition} from 'react';
import {useLocation, useNavigation} from 'react-router';
import {hasPendingView, PendingPage} from '~/components/PendingPage';
import {listenForOpenings, usePendingPage} from '~/lib/opening';
import {setSwiping, useSwiping} from '~/lib/page-swipe';

/**
 * A new page cross-fades with the old one, in place — the browser's view transitions, through React's `<ViewTransition>`.
 * Keyed by the path, so a page that changes in place (a filter, a sort, a fetcher's answer) does not animate, and a
 * new page starts with its own state. A page opened with a click that takes more than a moment comes as its waiting
 * page (`PendingPage`, T-571), keyed by its own path: the cross-fade runs then, and the page's data replaces it in place.
 * A product swiped to (`SwipeablePage`) changes with no transition: its page has already slid into place. Still for a
 * visitor who asks for less motion (app.css); a browser without view transitions changes the page at once.
 */
export function PageTransition({children}: {children: ReactNode}) {
  const {pathname} = useLocation();
  const swiping = useSwiping();
  // The swipe is over once its page is in.
  useEffect(() => setSwiping(false), [pathname]);
  useEffect(listenForOpenings, []);
  // A page opened with a click shows at once while it loads, under the key of the page that replaces it in place.
  const pending = usePendingPage();
  const shown = pending && hasPendingView(pending.location.pathname) ? pending : null;

  return (
    <ViewTransition
      key={shown?.location.pathname ?? pathname}
      default="none"
      enter={swiping ? 'none' : 'page-enter'}
      exit={swiping ? 'none' : 'page-exit'}
    >
      {shown ? <PendingPage {...shown} /> : children}
    </ViewTransition>
  );
}

/**
 * A thin bar along the top of the window while the next page loads. It appears only when the wait is long enough to
 * notice (`page-progress` in app.css waits a moment before it grows), and goes when the page arrives. Decorative:
 * the page's own heading tells a screen reader where it is.
 */
export function NavigationProgress() {
  const loading = useNavigation().state === 'loading';
  // A product swiped to is already shown while its page loads (`SwipeablePage`).
  const swiping = useSwiping();
  if (!loading || swiping) return null;

  return (
    <div aria-hidden="true" className="page-progress fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-foreground" />
  );
}
