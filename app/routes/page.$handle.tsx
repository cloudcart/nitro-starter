import {useLoaderData} from 'react-router';
import {Analytics} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/page.$handle';
import {crumbsJsonLd, metaTranslator, seoMeta, storeName, storeOrigin} from '~/lib/meta';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {pagePath} from '~/lib/urls';
import {PageContent} from '~/components/PageContent';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({data, matches}) => {
  // A page that throws is titled by the root's `meta`.
  if (!data) return [];
  const {page} = data;
  const path = pagePath(page.handle);
  return seoMeta(matches, {
    title: page.seo.title || page.title,
    // The page's text cut to about 160 characters, and without any a sentence of our own (B-405).
    description:
      page.seo.description ||
      page.bodySummary?.slice(0, 160) ||
      metaTranslator(matches)('seo.page', {page: page.title, store: storeName(matches)}),
    url: `${storeOrigin(matches)}${path}`,
    jsonLd: crumbsJsonLd(matches, [{title: page.title}], path),
  });
};

/** /page/{handle} — a content page: about us, delivery, the store's policies… */
export async function loader({context, params}: Route.LoaderArgs) {
  const {page, errors} = await context.storefront.query(PAGE_QUERY, {
    variables: {handle: params.handle},
  });

  if (!page) throw missingResource(errors, `Page ${params.handle} not found`);

  return {page};
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      {/* The breadcrumb where every page has it; the text in a column narrow enough to read. */}
      <Breadcrumbs items={[{title: page.title}]} />
      <div className="mx-auto max-w-reading">
        <PageContent title={page.title} html={page.body} />
      </div>
      <Analytics.ContentPageView data={{page: {id: page.id, handle: page.handle}}} />
    </div>
  );
}

const PAGE_QUERY = `#graphql
  query Page($handle: String!) {
    page(handle: $handle) {
      id
      handle
      title
      body
      bodySummary
      seo {
        title
        description
      }
    }
  }
` as const;
