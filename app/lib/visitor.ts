import {fetchVisitorData} from '@cloudcart/nitrogen';
import {useVisitorData} from '@cloudcart/nitrogen-react';
import type {loadVisitorData} from '~/lib/visitor.server';

/** Where the browser asks the visitor's own data on a page cached for every visitor (`routes/visitor.tsx`). */
export const VISITOR_PATH = '/visitor';

/** The visitor's own data as `/visitor` answers it: `loadVisitorData`'s, each part arrived. */
export type VisitorData = {
  [Part in keyof ReturnType<typeof loadVisitorData>]: Awaited<ReturnType<typeof loadVisitorData>[Part]>;
};

/** A part of the root's data that streams with a page rendered for the visitor, or arrives whole from `/visitor`. */
export type Streamed<T> = Promise<T> | T;

/** Marks the root's data that came back with the visitor's own (`rootWithVisitorData`). */
const INCLUDED = 'visitorIncluded';

/**
 * The root's data after a form or a same-address revalidation (the root's `clientLoader`): on a page cached for every
 * visitor, with the visitor's own data from `/visitor`. The revalidation, and a cart form's pending state with it, then
 * ends only when the store's answer is in, so the cart goes from the optimistic change straight to the store's cart,
 * never back to the one from before the form (B-509). A failed request leaves the server's data, and
 * `useRootWithVisitorData` asks again.
 */
export async function rootWithVisitorData<Root extends {visitorFromBrowser: boolean}>(root: Root) {
  if (!root.visitorFromBrowser) return root;
  const visitor = await fetchVisitorData<VisitorData>(VISITOR_PATH);
  return visitor ? {...root, ...visitor, [INCLUDED]: true as const} : root;
}

/**
 * The root's data with the visitor's own: on a page cached for every visitor, the early request's answer
 * (`VisitorDataScript`) until a revalidation brings the visitor's data in the root's (`rootWithVisitorData`).
 */
export function useRootWithVisitorData<Root extends {visitorFromBrowser: boolean}>(root: Root) {
  const visitor = useVisitorData<VisitorData>(VISITOR_PATH, {
    enabled: root.visitorFromBrowser && !(INCLUDED in root),
    refreshKey: root,
  });
  return visitor ? {...root, ...visitor} : root;
}
