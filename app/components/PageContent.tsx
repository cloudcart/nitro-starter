import type {ReactNode} from 'react';
import {RichText} from '@cloudcart/nitrogen-react';

/**
 * A content page's body: the title, then the merchant's HTML on the type and colour tokens, then anything the page
 * adds below it (the contact page's details and form). The page gives it the reading column.
 */
export function PageContent({title, html, children}: {title: string; html?: string | null; children?: ReactNode}) {
  return (
    <article className="flex flex-col gap-8">
      <h1 className="text-title">{title}</h1>
      {html && <RichText data={html} headingStart={2} className="prose prose-tokens prose-reading max-w-none" />}
      {children}
    </article>
  );
}
