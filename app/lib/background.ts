/**
 * A resource route's answer for a section the page loads in the background (`useFetcher().load`): a failure is
 * logged and answered as `fallback`, the section's empty answer, so the section stays empty and the page as it was.
 * Thrown, it would reach the page's error boundary and replace the whole page. The route uses it twice: in `loader`
 * around its own answer (the API failed, B-423), and in `clientLoader` around `serverLoader()` (the request failed in
 * the browser — the network gone — B-460).
 */
export function inBackground<T, F>(answer: Promise<T>, fallback: F): Promise<T | F> {
  return answer.catch((error: unknown) => {
    console.error(error);
    return fallback;
  });
}
