import type {loadVisitorData} from '~/lib/visitor.server';

/** Where the browser asks the visitor's own data on a page cached for every visitor (`routes/visitor.tsx`). */
export const VISITOR_PATH = '/visitor';

/** The visitor's own data as `/visitor` answers it: `loadVisitorData`'s, each part arrived. */
export type VisitorData = {
  [Part in keyof ReturnType<typeof loadVisitorData>]: Awaited<ReturnType<typeof loadVisitorData>[Part]>;
};

/** A part of the root's data that streams with a page rendered for the visitor, or arrives whole from `/visitor`. */
export type Streamed<T> = Promise<T> | T;
