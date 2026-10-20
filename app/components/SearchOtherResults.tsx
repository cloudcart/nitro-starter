import {useTranslation} from '@cloudcart/nitrogen';
import {PillLinks} from '~/components/PillLinks';
import {articlePath, pagePath} from '~/lib/urls';

/** How many pages, and how many articles, the search page shows above its products. */
export const OTHER_RESULTS = 10;

type Found = {title: string; handle: string};

/**
 * The pages and articles a search found, above its products: on the search page, and on the page being opened from
 * the search panel's answer (T-574).
 */
export function SearchOtherResults({pages, articles}: {pages: Found[]; articles: Found[]}) {
  const {t} = useTranslation();
  const links = [
    ...pages.slice(0, OTHER_RESULTS).map((page) => ({title: page.title, to: pagePath(page.handle)})),
    ...articles.slice(0, OTHER_RESULTS).map((article) => ({title: article.title, to: articlePath(article.handle)})),
  ];
  if (!links.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h5">{t('search.pagesAndArticles')}</h2>
      <PillLinks label={t('search.pagesAndArticles')} links={links} />
    </section>
  );
}
