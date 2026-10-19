import {useTranslation} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import {ButtonLink} from '~/components/ui/Button';
import {HERO} from '~/lib/home';

/**
 * The home page's hero: an image across the page with the heading, a line of text and a button over it. Its content
 * is kept in code (`HERO` in `app/lib/home.ts`). A gradient from the foreground colour sits behind the text block,
 * whatever its height: at least 55 % behind every line, so white text keeps 4.5:1 even on a white photo, fading out
 * above it so the rest of the photo stays clear.
 */
export function Hero({shopName, content = HERO}: {shopName: string; content?: typeof HERO}) {
  const {t} = useTranslation();
  const {image, heading, text, button} = content;

  return (
    // The layers in the document's order, none below the section: tools that check contrast see the photo behind the
    // text (a negative `z-index` hid it from axe, which then measured white on the section's grey).
    <section className="relative flex aspect-[4/5] items-end overflow-hidden bg-surface md:aspect-video lg:aspect-[21/9]">
      <Image
        data={{url: image.url, width: image.width, height: image.height, altText: image.alt ? t(image.alt) : ''}}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-24 bottom-0 bg-gradient-to-t from-shade/75 via-shade/55 via-80% to-transparent"
        />
        <div className="relative mx-auto w-full max-w-page px-gutter py-10 text-background md:px-gutter-md md:py-16">
          <h1 className="max-w-reading text-display">{t(heading, {shop: shopName})}</h1>
          <p className="mt-4 max-w-column">{t(text, {shop: shopName})}</p>
          <ButtonLink to={button.to} variant="inverse" className="mt-8">
            {t(button.label, {shop: shopName})}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
