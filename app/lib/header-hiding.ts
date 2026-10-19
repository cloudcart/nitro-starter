import {type RefObject, useEffect} from 'react';

/** How far the page must move before the header follows it, so a trembling finger does not flicker it. */
const SCROLL_SLACK = 6;

/**
 * The header gives the screen to the page: past its own height, it leaves while the visitor scrolls down and comes
 * back as soon as they scroll up, reach the top, or move the keyboard's focus into it. The state is
 * `data-header-hidden` on `<html>`, for the CSS (`header-hidden:`): the header slides away below 990 px, and a
 * listing's row of filters and sort, sticky under it, takes the top. The scroll is read once a frame.
 */
export function useHeaderHiding(header: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    const element = header.current;
    const show = (hidden: boolean) => root.toggleAttribute('data-header-hidden', hidden);
    let last = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y <= (element?.offsetHeight ?? 0)) show(false);
        else if (y - last > SCROLL_SLACK) show(true);
        else if (last - y > SCROLL_SLACK) show(false);
        // A smaller move adds up with the next ones.
        else return;
        last = y;
      });
    };
    const onFocus = () => show(false);

    window.addEventListener('scroll', onScroll, {passive: true});
    element?.addEventListener('focusin', onFocus);
    return () => {
      window.removeEventListener('scroll', onScroll);
      element?.removeEventListener('focusin', onFocus);
      cancelAnimationFrame(frame);
      show(false);
    };
  }, [header]);
}
