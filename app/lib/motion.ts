/** The visitor's wish for less motion. The CSS follows it in app.css; script that moves the page reads it here. */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Calls `onChange` when the wish changes, for `useSyncExternalStore`. */
export function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * How a scroll the page starts should move: at once for a visitor who asks for less motion, smoothly otherwise. A
 * script's `behavior: 'smooth'` is not overridden by the CSS for reduced motion, so it asks here (B-211).
 */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia(REDUCED_MOTION).matches ? 'auto' : 'smooth';
}

/** Whether the visitor asks for less motion now: a script's animation is skipped then. */
export function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

/**
 * Opens a box in place: it grows from `fromHeight` — what stood there before it, a button say — to its own height,
 * clipped, its content fading in. Call it once the box is laid out; nothing moves for a visitor who asks for less
 * motion.
 */
export function growOpen(element: HTMLElement, fromHeight: number) {
  if (reducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      {height: `${fromHeight}px`, opacity: 0, overflow: 'clip'},
      {height: `${element.offsetHeight}px`, opacity: 1, overflow: 'clip'},
    ],
    {duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)'},
  );
}
